// A lot of the code in this file is copied or derived from Yjs and used
// under the terms of the following license:

// The MIT License (MIT)

// Copyright (c) 2014
//   - Kevin Jahns <kevin.jahns@rwth-aachen.de>.
//   - Chair of Computer Science 5 (Databases & Information Systems), RWTH Aachen University, Germany

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Y } from '../y'
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

export const svToString = (sv: Uint8Array | Map<number, number>) => {
  if (sv instanceof Uint8Array) {
    sv = Y.decodeStateVector(sv)
  }
  return Array.from(sv.entries())
    .map(([clientId, clock]) => `${clientId}:${clock}`)
    .join(' ')
}

export const updateToString = (updates: Uint8Array | ReturnType<typeof Y.decodeUpdate>) => {
  if (updates instanceof Uint8Array) {
    updates = Y.decodeUpdate(updates)
  }
  const { structs, ds } = updates

  const structsStr = structs
    .map((value) => {
      if (value instanceof Y.Item) {
        const id = value.id
        const content = value.content as any
        return `${id.client}:${id.clock}:${
          content.str ? JSON.stringify(content.str) : JSON.stringify(content)
        }`
      } else {
        return null
      }
    })
    .filter((s) => s !== null)
    .join(' ')

  const dsStr = Array.from(ds.clients.entries())
    .map(([client, item]) => {
      return `${client}(${item
        .map(({ clock, len }) => `${clock}:${len}`)
        .join(' ')})`
    })
    .join(' ')

  return [
    structs.length > 0 ? `S: ${structsStr}` : '',
    ds.clients.size > 0 ? `D: ${dsStr}` : ''
  ].join(' ')
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

  // Make sure structs are in clock order - expected by findIndexSS
  for (const structs of clientStructs.values()) {
    structs.sort((a: Y.AbstractStruct, b: Y.AbstractStruct) => a.id.clock - b.id.clock)
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

export const packUpdates = (updates: Uint8Array[]) => {
  const yUpdate = Y.decodeUpdate(Y.mergeUpdates(updates))
  const newStructs = []
  let currentItem: Y.Item | Y.GC | undefined
  let nextItem: Y.Item | Y.GC | undefined
  while ((nextItem = yUpdate.structs.shift())) {
    if (nextItem instanceof Y.Item && currentItem instanceof Y.Item) {
      // Logic from https://github.com/yjs/yjs/blob/710ac31af3bc1520437fdc9b0e6eef9cc2993e89/src/structs/Item.js#L571-L583
      if (
        currentItem.constructor === nextItem.constructor &&
        Y.compareIDs(nextItem.origin, currentItem.lastId) &&
        // currentItem.right === nextItem &&
        Y.compareIDs(currentItem.rightOrigin, nextItem.rightOrigin) &&
        currentItem.id.client === nextItem.id.client &&
        currentItem.id.clock + currentItem.length === nextItem.id.clock &&
        currentItem.deleted === nextItem.deleted &&
        currentItem.redone === null &&
        nextItem.redone === null &&
        currentItem.content.constructor === nextItem.content.constructor &&
        currentItem.content.mergeWith(nextItem.content)
      ) {
        if (nextItem.keep) {
          // Is this flag persisted? If not, this isn't necessary, but no harm
          currentItem.keep = true
        }
        currentItem.length += nextItem.length
        continue
      }
    }

    // Couldn't merge, so push as is
    newStructs.push(nextItem)
    currentItem = nextItem
  }

  const clientStructs = new Map<number, Struct[]>()

  for (const struct of newStructs) {
    const clientId = struct.id.client
    if (!clientStructs.has(clientId)) {
      clientStructs.set(clientId, [])
    }
    clientStructs.get(clientId)!.push(struct)
  }
  // Make sure structs are in clock order - expected by findIndexSS
  for (const structs of clientStructs.values()) {
    structs.sort((a: Y.AbstractStruct, b: Y.AbstractStruct) => a.id.clock - b.id.clock)
  }

  const encoder = new Y.UpdateEncoderV1()
  encoding.writeVarUint(encoder.restEncoder, clientStructs.size)

  // Write items with higher client ids first
  // This heavily improves the conflict algorithm.
  Array.from(clientStructs.entries())
    .sort((a, b) => b[0] - a[0])
    .forEach(([clientId, structs]) => {
      writeStructsForClient(
        encoder,
        clientStructs.get(clientId)!,
        clientId,
        structs[0]!.id.clock
      )
    })

  writeDeleteSet(encoder, yUpdate.ds)

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
