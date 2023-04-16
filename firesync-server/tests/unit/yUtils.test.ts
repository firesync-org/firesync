import { Y } from '../../src/y'

import { expect } from 'chai'
import {
  filterUpdates,
  packUpdates,
  updateToString
} from '../../src/shared/yUtils'
import {
  RandomUpdateConfig,
  YTypeName,
  applyRandomUpdate
} from '../../src/shared/chaosMonkey'
import { nTimes } from '../utils/utils'

describe('filterUpdates', () => {
  it('should not return updates covered in state vector', () => {
    const doc = new Y.Doc()
    const text = doc.getText('t')
    text.insert(0, 'baz') // Clock: 0 - 2
    text.insert(0, 'foo') // Clock: 3 - 5
    text.insert(0, 'bar') // Clock: 6 - 8

    const update = filterUpdates(
      [Y.encodeStateAsUpdate(doc)],
      new Map([[doc.clientID, 5]])
    )

    const { structs } = Y.decodeUpdate(update)

    expect(simpleStructs(structs)[0]).to.include({
      client: doc.clientID,
      clock: 5,
      length: 1,
      contentStr: 'o'
    })
    expect(simpleStructs(structs)[1]).to.include({
      client: doc.clientID,
      clock: 6,
      length: 3,
      contentStr: 'bar'
    })
  })

  it('should return all delete sets', () => {
    const doc = new Y.Doc()
    const text = doc.getText('t')
    text.insert(0, 'baz') // Clock: 0 - 2
    text.delete(1, 2) // Text reads 'b'
    text.insert(0, 'foo') // Clock: 3 - 5
    text.delete(1, 1) // Text reads 'fba'
    text.insert(0, 'bar') // Clock: 6 - 8
    text.delete(1, 1) // Text reads 'bafba'

    const update = filterUpdates(
      [Y.encodeStateAsUpdate(doc)],
      new Map([[doc.clientID, 5]])
    )

    const { ds } = Y.decodeUpdate(update)

    const clientDs = ds.clients.get(doc.clientID)
    if (clientDs === undefined) {
      throw new Error('undefined')
    }
    expect(clientDs[0]!.clock).to.equal(1)
    expect(clientDs[0]!.len).to.equal(2)
    expect(clientDs[1]!.clock).to.equal(4)
    expect(clientDs[1]!.len).to.equal(1)
    expect(clientDs[2]!.clock).to.equal(7)
    expect(clientDs[2]!.len).to.equal(1)
  })
})

describe('packUpdates', () => {
  const ROUNDS = 10
  const UPDATES_PER_DOC_PER_ROUND = 100
  const SYNC_EACH_N_ITERATIONS = 3

  // With these test, we're going to set up three ydocs all generating random operations
  // We are then going to merge all the updates into one update, and apply it
  // to a doc from before the random updates. It should match the content
  // of the current ydocs

  test('fuzz testing - Y.Text', () => {
    nTimes(ROUNDS, () => {
      const [ydoc1, ydoc2, ydoc3] = [new Y.Doc(), new Y.Doc(), new Y.Doc()]

      const updatesToPack: Uint8Array[] = []
      ydoc1.on('update', (update: Uint8Array) => updatesToPack.push(update))

      nTimes(UPDATES_PER_DOC_PER_ROUND, (n) => {
        applyRandomUpdate(ydoc1.getText('a'))
        applyRandomUpdate(ydoc2.getText('a'))
        applyRandomUpdate(ydoc3.getText('a'))
        if (n % SYNC_EACH_N_ITERATIONS === 0) {
          syncYDocs([ydoc1, ydoc2, ydoc3])
        }
      })
      syncYDocs([ydoc1, ydoc2, ydoc3])

      const packedUpdates = packUpdates(updatesToPack)
      const ydoc = new Y.Doc()
      Y.applyUpdate(ydoc, packedUpdates)

      // console.log(updatesToPack.map(updateToString))
      // console.log(updateToString(packedUpdates))
      // console.log(ydoc.getText('a').toJSON())

      expect(ydoc.getText('a').toJSON()).to.equal(ydoc1.getText('a').toJSON())
    })
  })

  test('fuzz testing - Y.Map', () => {
    nTimes(ROUNDS, () => {
      const [ydoc1, ydoc2, ydoc3] = [new Y.Doc(), new Y.Doc(), new Y.Doc()]

      const updatesToPack: Uint8Array[] = []
      ydoc1.on('update', (update: Uint8Array) => updatesToPack.push(update))

      nTimes(UPDATES_PER_DOC_PER_ROUND, (n) => {
        applyRandomUpdate(ydoc1.getMap('a'))
        applyRandomUpdate(ydoc2.getMap('a'))
        applyRandomUpdate(ydoc3.getMap('a'))
        if (n % SYNC_EACH_N_ITERATIONS === 0) {
          syncYDocs([ydoc1, ydoc2, ydoc3])
        }
      })
      syncYDocs([ydoc1, ydoc2, ydoc3])

      const packedUpdates = packUpdates(updatesToPack)
      const ydoc = new Y.Doc()
      Y.applyUpdate(ydoc, packedUpdates)

      // console.log(updatesToPack.map(updateToString))
      // console.log(updateToString(packedUpdates))
      // console.log(ydoc.getMap('a').toJSON())

      expect(ydoc.getMap('a').toJSON()).to.deep.equal(
        ydoc1.getMap('a').toJSON()
      )
    })
  })

  test('fuzz testing - Y.Array', () => {
    nTimes(ROUNDS, () => {
      const [ydoc1, ydoc2, ydoc3] = [new Y.Doc(), new Y.Doc(), new Y.Doc()]

      const updatesToPack: Uint8Array[] = []
      ydoc1.on('update', (update: Uint8Array) => updatesToPack.push(update))

      nTimes(UPDATES_PER_DOC_PER_ROUND, (n) => {
        applyRandomUpdate(ydoc1.getArray('a'))
        applyRandomUpdate(ydoc2.getArray('a'))
        applyRandomUpdate(ydoc3.getArray('a'))
        if (n % SYNC_EACH_N_ITERATIONS === 0) {
          syncYDocs([ydoc1, ydoc2, ydoc3])
        }
      })
      syncYDocs([ydoc1, ydoc2, ydoc3])

      const packedUpdates = packUpdates(updatesToPack)
      const ydoc = new Y.Doc()
      Y.applyUpdate(ydoc, packedUpdates)

      // console.log(updatesToPack.map(updateToString))
      // console.log(updateToString(packedUpdates))
      // console.log(ydoc.getArray('a').toJSON())

      expect(ydoc.getArray('a').toJSON()).to.deep.equal(
        ydoc1.getArray('a').toJSON()
      )
    })
  })

  test('fuzz testing - everything', () => {
    nTimes(ROUNDS, () => {
      const [ydoc1, ydoc2, ydoc3] = [new Y.Doc(), new Y.Doc(), new Y.Doc()]

      const updatesToPack: Uint8Array[] = []
      ydoc1.on('update', (update: Uint8Array) => updatesToPack.push(update))

      const randomUpdateConfig: RandomUpdateConfig = {
        // Insert nested Yjs types
        mapInsertTypeWeights: new Map<YTypeName, number>([
          ['string', 1],
          ['text', 1],
          ['array', 1],
          ['map', 1]
        ]),
        arrayInsertTypeWeights: new Map<YTypeName, number>([
          ['string', 1],
          ['text', 1],
          ['array', 1],
          ['map', 1]
        ])
      }

      nTimes(UPDATES_PER_DOC_PER_ROUND, (n) => {
        applyRandomUpdate(ydoc1.getMap('a'), randomUpdateConfig)
        applyRandomUpdate(ydoc2.getMap('a'), randomUpdateConfig)
        applyRandomUpdate(ydoc3.getMap('a'), randomUpdateConfig)
        if (n % SYNC_EACH_N_ITERATIONS === 0) {
          syncYDocs([ydoc1, ydoc2, ydoc3])
        }
      })
      syncYDocs([ydoc1, ydoc2, ydoc3])

      const packedUpdates = packUpdates(updatesToPack)
      const ydoc = new Y.Doc()
      Y.applyUpdate(ydoc, packedUpdates)

      // console.log(updatesToPack.map(updateToString))
      // console.log(updateToString(packedUpdates))
      // console.log(JSON.stringify(ydoc.getMap('a').toJSON(), null, 2))

      expect(ydoc.getMap('a').toJSON()).to.deep.equal(
        ydoc1.getMap('a').toJSON()
      )
    })
  })
})

const simpleStructs = (structs: Array<Y.Item | Y.GC>) =>
  structs.map((struct) => {
    return {
      client: struct.id.client,
      clock: struct.id.clock,
      length: struct.length,
      contentStr:
        struct instanceof Y.Item
          ? (struct.content as Y.ContentString).str
          : null
    }
  })

const syncYDocs = (ydocs: Y.Doc[]) => {
  if (ydocs.length === 0) return
  let prev: Y.Doc | undefined
  for (const ydoc of ydocs) {
    if (prev) {
      // Apply updates from prev to this ydoc
      Y.applyUpdate(
        ydoc,
        Y.encodeStateAsUpdate(prev, Y.encodeStateVector(ydoc))
      )
    }
    prev = ydoc
  }

  // Apply last to first to complete the circle
  const ydoc = ydocs[0]!
  Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(prev!, Y.encodeStateVector(ydoc)))
}
