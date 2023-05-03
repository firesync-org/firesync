/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { expect } from 'chai'
import { Y } from '@firesync/client'
import { tryUntil, testWrapper } from './utils'

describe('Server Syncing', () => {
  test(
    'client needs the entire doc',
    testWrapper(
      {},
      async ({ docKey, client: client1, server, ydoc: ydoc1, token }) => {
        // Set up 2 docs with content in sync
        const yText1 = ydoc1.getText('t')
        yText1.insert(0, 'foobaz')
        yText1.insert(3, 'bar')

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc1.clientID]).to.equal(9)
        })

        const ydoc2 = new Y.Doc()
        const client2 = server.getClient({ token })
        client2.subscribe(docKey, ydoc2)

        const yText2 = ydoc2.getText('t')
        await tryUntil(async () => {
          expect(yText2.toString()).to.equal('foobarbaz')
        })
      }
    )
  )

  test(
    'should handle the client needing a partial set of updates',
    testWrapper(
      {},
      async ({ docKey, client: client1, server, ydoc: ydoc1, token }) => {
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
        const client2 = server.getClient({ token })

        const receivedUpdate = new Promise<Uint8Array>((resolve) => {
          client2.on('update', (docKey, update) => {
            resolve(update)
          })
        })

        client2.subscribe(docKey, ydoc2)

        // Check that recieved update only contains 'bar'
        const update = Y.decodeUpdate(await receivedUpdate)
        expect(update.structs.length).to.equal(1)
        expect(update.structs[0]!.length).to.equal(3)
        expect(
          ((update.structs[0]! as Y.Item).content as Y.ContentString).str
        ).to.equal('bar')

        await tryUntil(async () => {
          expect(yText2.toString()).to.equal('foobar')
        })

        // Make some changes to doc2 while client1 is disconnected to test the
        // resyncing going the other way with client ids client1 doesn't know about
        client1.disconnect()
        await tryUntil(async () => {
          expect(client1.connected).to.equal(false)
        })
        yText2.insert(6, 'zip')

        client1.connect()
        await tryUntil(async () => {
          expect(yText1.toString()).to.equal('foobarzip')
        })
      }
    )
  )

  test(
    'should handle the client needing a partial set of updates with deletes',
    testWrapper({}, async ({ docKey, server, ydoc: ydoc1, token }) => {
      // Set up 2 docs with content in sync
      const ydoc2 = new Y.Doc()
      const yText1 = ydoc1.getText('t')
      yText1.insert(0, 'foo bar baz')
      Y.applyUpdate(ydoc2, Y.encodeStateAsUpdate(ydoc1))

      // Apply a delete to doc 1 - get rid of 'bar '
      yText1.delete(4, 4)

      // Wait for delete to hit server
      await tryUntil(async () => {
        const updates = await server.getDocUpdates(docKey)
        expect(updates.length).to.equal(2)
      })

      // confirm doc 2 needs a partial set of updates
      const yText2 = ydoc2.getText('t')
      expect(yText2.toString()).to.equal('foo bar baz')

      // subscribe to doc 2
      const client2 = server.getClient({ token })

      client2.subscribe(docKey, ydoc2)

      await tryUntil(async () => {
        expect(yText2.toString()).to.equal('foo baz')
      })
    })
  )

  test(
    'client is up to date',
    testWrapper({}, async ({ docKey, client, server, ydoc }) => {
      const yText = ydoc.getText('t')
      yText.insert(0, 'foo')

      await tryUntil(async () => {
        const sv = await server.getDocStateVector(docKey)
        expect(sv[ydoc.clientID]).to.equal(3)
      })

      client.disconnect()

      const receivedUpdate = new Promise<Uint8Array>((resolve) => {
        client.on('update', (docKey, update) => {
          resolve(update)
        })
      })

      client.connect()

      const update = await receivedUpdate
      const { structs } = Y.decodeUpdate(update)

      expect(structs).to.have.length(0)
    })
  )

  test(
    'client sending updates the server already has',
    testWrapper(
      { connect: false },
      async ({ docKey, client, server, ydoc }) => {
        // Set up some content
        const yText = ydoc.getText('t')
        yText.insert(0, 'foo')
        yText.insert(0, 'bar')

        client.connect()
        client.subscribe(docKey, ydoc)

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc.clientID]).to.equal(6)
        })

        // Don't send the next set of updates immediately
        client.chaosMonkey.ignoreUpdatesFromDocs.add(docKey)
        yText.insert(3, 'baz')

        // Send updates to client again including new
        client.__FOR_TESTING_ONLY_DO_NOT_USE.sendUpdate(
          docKey,
          Y.encodeStateAsUpdate(ydoc)
        )

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

        // Check that the server filters the updates to just the additional ones
        // Second update should only be 'baz'
        expect(updates[1]!.structs).to.have.length(1)
        expect(
          ((updates[1]!.structs[0] as Y.Item).content as Y.ContentString).str
        ).to.equal('baz')
      }
    )
  )

  test(
    'client sends updates that do not match the current state vector',
    testWrapper(
      { connect: false },
      async ({ docKey, client, server, ydoc }) => {
        // Set up some content
        const yText = ydoc.getText('t')
        yText.insert(0, 'foo')

        client.connect()
        client.subscribe(docKey, ydoc)

        await tryUntil(async () => {
          const sv = await server.getDocStateVector(docKey)
          expect(sv[ydoc.clientID]).to.equal(3)
        })

        // Don't send the next set of updates immediately
        client.chaosMonkey.ignoreUpdatesFromDocs.add(docKey)
        // Prevent client from reconnecting and sending
        // full update on error
        client.chaosMonkey.reconnectOnError = false

        // Insert more updates, but get sv after some of them
        yText.insert(0, 'bar')
        const partialSv = Y.encodeStateVector(ydoc)
        yText.insert(3, 'baz')

        let error: Error | null
        client.on('error', (_error) => {
          error = _error
        })

        // Send updates to client again including new
        const partialUpdate = Y.encodeStateAsUpdate(ydoc, partialSv)
        client.__FOR_TESTING_ONLY_DO_NOT_USE.sendUpdate(docKey, partialUpdate)

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
      }
    )
  )
})
