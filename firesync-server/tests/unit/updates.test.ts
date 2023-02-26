import { expect } from 'chai'
import * as Y from 'yjs'
import { filterUpdates } from '../../src/server/lib/Docs/updates'

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
