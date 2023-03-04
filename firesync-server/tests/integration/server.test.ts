/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { expect } from 'chai'
import { Y } from '@firesync/client'
import { tryUntil, testWrapper, getClient } from './utils'

describe('Server Syncing', () => {
  test(
    'should handle the client needing the entire doc',
    testWrapper(
      {},
      async ({
        docKey,
        client: { connection: connection1, session },
        server,
        ydoc: ydoc1
      }) => {
        // Set up 2 docs with content in sync
        const yText1 = ydoc1.getText('t')
        yText1.insert(0, 'foobaz')
        yText1.insert(3, 'bar')

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc1.clientID]).to.equal(9)
        })

        const ydoc2 = new Y.Doc()
        const { connection: connection2 } = getClient({
          session
        })
        connection2.subscribe(docKey, ydoc2)

        const yText2 = ydoc2.getText('t')
        await tryUntil(async () => {
          expect(yText2.toString()).to.equal('foobarbaz')
        })

        connection1.disconnect()
        connection2.disconnect()
      }
    )
  )

  test(
    'should handle the client needing a partial set of updates',
    testWrapper(
      {},
      async ({
        docKey,
        client: { connection: connection1, session },
        server,
        ydoc: ydoc1
      }) => {
        // Set up 2 docs with content in sync
        const ydoc2 = new Y.Doc()
        const yText1 = ydoc1.getText('t')
        yText1.insert(0, 'foo')
        Y.applyUpdate(ydoc2, Y.encodeStateAsUpdate(ydoc1))

        // Apply more updates to doc 1
        yText1.insert(3, 'bar')

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc1.clientID]).to.equal(6)
        })

        // confirm doc 2 needs a partial set of updates
        const yText2 = ydoc2.getText('t')
        expect(yText2.toString()).to.equal('foo')

        // subscribe to doc 2
        const { connection: connection2 } = getClient({
          session
        })
        connection2.subscribe(docKey, ydoc2)

        await tryUntil(async () => {
          expect(yText2.toString()).to.equal('foobar')
        })

        connection1.disconnect()
        connection2.disconnect()
      }
    )
  )

  test(
    'should handle the client already being up to date',
    testWrapper(
      {},
      async ({ docKey, client: { connection }, server, ydoc }) => {
        const yText = ydoc.getText('t')
        yText.insert(0, 'foo')

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc.clientID]).to.equal(3)
        })

        connection.disconnect()

        const receivedUpdate = new Promise<Uint8Array>((resolve) => {
          connection.on('update', (docKey, update) => {
            resolve(update)
          })
        })

        connection.connect()

        const update = await receivedUpdate
        const { structs } = Y.decodeUpdate(update)

        expect(structs).to.have.length(0)
      }
    )
  )

  // Check that the server filters the updates to just the additional ones
  test(
    'should handle updates from the client it already has',
    testWrapper(
      { connect: false },
      async ({ docKey, client: { connection }, server, ydoc }) => {
        // Set up some content
        const yText = ydoc.getText('t')
        yText.insert(0, 'foo')
        yText.insert(0, 'bar')

        connection.connect()
        connection.subscribe(docKey, ydoc)

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc.clientID]).to.equal(6)
        })

        // Don't send the next set of updates immediately
        connection.chaosMonkey.ignoreUpdatesFromDocs.add(docKey)
        yText.insert(3, 'baz')

        // Send updates to client again including new
        connection.sendUpdate(docKey, Y.encodeStateAsUpdate(ydoc))

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc.clientID]).to.equal(9)
        })

        const rawUpdates = await server.getDocUpdates(docKey)
        const updates = rawUpdates.map(Y.decodeUpdate)

        // First update should be 'foo' and 'bar'
        expect(updates[0]!.structs).to.have.length(2)
        expect(
          ((updates[0]!.structs[0] as Y.Item).content as Y.ContentString).str
        ).to.equal('foo')
        expect(
          ((updates[0]!.structs[1] as Y.Item).content as Y.ContentString).str
        ).to.equal('bar')

        // Second update should only be 'baz'
        expect(updates[1]!.structs).to.have.length(1)
        expect(
          ((updates[1]!.structs[0] as Y.Item).content as Y.ContentString).str
        ).to.equal('baz')

        connection.disconnect()
      }
    )
  )

  test(
    'should error if the client sends updates that do not match the current state vector',
    testWrapper(
      { connect: false },
      async ({ docKey, client: { connection }, server, ydoc }) => {
        // Set up some content
        const yText = ydoc.getText('t')
        yText.insert(0, 'foo')

        connection.connect()
        connection.subscribe(docKey, ydoc)

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc.clientID]).to.equal(3)
        })

        // Don't send the next set of updates immediately
        connection.chaosMonkey.ignoreUpdatesFromDocs.add(docKey)

        // Prevent connection from reconnecting and sending
        // full update on error
        connection.reconnect = () => {
          return null
        }

        // Insert more updates, but get sv after some of them
        yText.insert(0, 'bar')
        const partialSv = Y.encodeStateVector(ydoc)
        yText.insert(3, 'baz')

        let error: Error | null
        connection.on('error', (_error) => {
          error = _error
        })

        // Send updates to client again including new
        const partialUpdate = Y.encodeStateAsUpdate(ydoc, partialSv)
        connection.sendUpdate(docKey, partialUpdate)

        await tryUntil(async () => {
          expect(error?.name).to.equal('BadRequestError')
        })

        // Should reject update
        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc.clientID]).to.equal(3)
        })

        const rawUpdates = await server.getDocUpdates(docKey)
        // rawUpdates.forEach((update) => logger.debug({ update }))
        const updates = rawUpdates.map(Y.decodeUpdate)

        // Should only have 'foo' update
        expect(updates).to.have.length(1)
        expect(updates[0]!.structs).to.have.length(1)
        expect(
          ((updates[0]!.structs[0] as Y.Item).content as Y.ContentString).str
        ).to.equal('foo')

        connection.disconnect()
      }
    )
  )

  it.todo('should only send updates that the client needs')

  it.todo('should do all the above tests but with multiple clients ids')
})
