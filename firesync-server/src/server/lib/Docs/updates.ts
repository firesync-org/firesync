import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as array from 'lib0/array'

type Struct = Y.Item | Y.GC

export const getInitialStateOfUpdate = (update: Uint8Array) => {
  const sv = new Map<number, number>()

  const { structs } = Y.decodeUpdate(update)
  for (const struct of structs) {
    const clientId = struct.id.client
    const initialClock = struct.id.clock
    if (!sv.has(clientId)) {
      sv.set(clientId, initialClock)
    }
    sv.set(clientId, Math.min(sv.get(clientId)!, initialClock))
  }

  return sv
}

export const getFinalStateOfUpdate = (update: Uint8Array) => {
  const sv = new Map<number, number>()

  const { structs } = Y.decodeUpdate(update)
  for (const struct of structs) {
    const clientId = struct.id.client
    const finalClock = struct.id.clock + struct.length
    if (!sv.has(clientId)) {
      sv.set(clientId, finalClock)
    }
    sv.set(clientId, Math.max(sv.get(clientId)!, finalClock))
  }

  return sv
}

export const filterUpdates = (
  updates: Uint8Array[],
  _sv: Map<number, number>
): Uint8Array => {
  const clientStructs = new Map<number, Struct[]>()
  const sv = new Map<number, number>()

  const dss: Array<DeleteSet> = []

  for (const update of updates) {
    const { structs, ds } = Y.decodeUpdate(update)
    for (const struct of structs) {
      const clientId = struct.id.client
      if (!clientStructs.has(clientId)) {
        clientStructs.set(clientId, [])
      }
      // TODO: Are structs already in clock order?
      clientStructs.get(clientId)!.push(struct)

      if (!sv.has(clientId)) {
        const clock = _sv.get(clientId)
        if (!clock) {
          // If we don't have the incoming client, get all structs
          sv.set(clientId, 0)
        } else if (struct.id.clock + struct.length > clock) {
          // only write if new structs are available
          sv.set(clientId, clock)
        }
      }
    }

    dss.push(ds)
  }

  const encoder = new Y.UpdateEncoderV1()
  encoding.writeVarUint(encoder.restEncoder, sv.size)

  // Write items with higher client ids first
  // This heavily improves the conflict algorithm.
  Array.from(sv.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([clientId, clock]) => {
      writeStructsForClient(
        encoder,
        clientStructs.get(clientId)!,
        clientId,
        clock
      )
    })

  writeDeleteSet(encoder, mergeDeleteSets(dss))

  return encoder.toUint8Array()
}

const writeStructsForClient = (
  encoder: Y.UpdateEncoderV1,
  structs: Struct[],
  client: number,
  clock: number
) => {
  // write first id
  clock = Math.max(clock, structs[0]!.id.clock) // make sure the first id exists
  const startNewStructs = findIndexSS(structs, clock)
  // write # encoded structs
  encoding.writeVarUint(encoder.restEncoder, structs.length - startNewStructs)
  encoder.writeClient(client)
  encoding.writeVarUint(encoder.restEncoder, clock)
  const firstStruct = structs[startNewStructs]!
  // write first struct with an offset
  firstStruct.write(encoder, clock - firstStruct.id.clock)
  for (let i = startNewStructs + 1; i < structs.length; i++) {
    structs[i]!.write(encoder, 0)
  }
}

const findIndexSS = (structs: Struct[], clock: number) => {
  let left = 0
  let right = structs.length - 1
  let mid = structs[right]!
  let midclock = mid.id.clock
  if (midclock === clock) {
    return right
  }
  // @todo does it even make sense to pivot the search?
  // If a good split misses, it might actually increase the time to find the correct item.
  // Currently, the only advantage is that search with pivoting might find the item on the first try.
  let midindex = Math.floor((clock / (midclock + mid.length - 1)) * right) // pivoting the search
  while (left <= right) {
    mid = structs[midindex]!
    midclock = mid.id.clock
    if (midclock <= clock) {
      if (clock < midclock + mid.length) {
        return midindex
      }
      left = midindex + 1
    } else {
      right = midindex - 1
    }
    midindex = Math.floor((left + right) / 2)
  }
  // Always check state before looking for a struct in StructStore
  // Therefore the case of not finding a struct is unexpected
  throw new Error('unexpected case')
}

const writeDeleteSet = (encoder: Y.UpdateEncoderV1, ds: DeleteSet) => {
  encoding.writeVarUint(encoder.restEncoder, ds.clients.size)
  ds.clients.forEach((dsitems, client) => {
    encoder.resetDsCurVal()
    encoding.writeVarUint(encoder.restEncoder, client)
    const len = dsitems.length
    encoding.writeVarUint(encoder.restEncoder, len)
    for (let i = 0; i < len; i++) {
      const item = dsitems[i]!
      encoder.writeDsClock(item.clock)
      encoder.writeDsLen(item.len)
    }
  })
}

class DeleteItem {
  clock: number
  len: number
  constructor(clock: number, len: number) {
    this.clock = clock
    this.len = len
  }
}

class DeleteSet {
  clients: Map<number, DeleteItem[]>
  constructor() {
    this.clients = new Map()
  }
}

const mergeDeleteSets = (dss: Array<DeleteSet>) => {
  const merged = new DeleteSet()
  for (let dssI = 0; dssI < dss.length; dssI++) {
    dss[dssI]!.clients.forEach((delsLeft, client) => {
      if (!merged.clients.has(client)) {
        // Write all missing keys from current ds and all following.
        // If merged already contains `client` current ds has already been added.
        /**
         * @type {Array<DeleteItem>}
         */
        const dels = delsLeft.slice()
        for (let i = dssI + 1; i < dss.length; i++) {
          array.appendTo(dels, dss[i]!.clients.get(client) || [])
        }
        merged.clients.set(client, dels)
      }
    })
  }
  sortAndMergeDeleteSet(merged)
  return merged
}

const sortAndMergeDeleteSet = (ds: DeleteSet) => {
  ds.clients.forEach((dels) => {
    dels.sort((a, b) => a.clock - b.clock)
    // merge items without filtering or splicing the array
    // i is the current pointer
    // j refers to the current insert position for the pointed item
    // try to merge dels[i] into dels[j-1] or set dels[j]=dels[i]
    let i, j
    for (i = 1, j = 1; i < dels.length; i++) {
      const left = dels[j - 1]!
      const right = dels[i]!
      if (left.clock + left.len >= right.clock) {
        left.len = Math.max(left.len, right.clock + right.len - left.clock)
      } else {
        if (j < i) {
          dels[j] = right
        }
        j++
      }
    }
    dels.length = j
  })
}
