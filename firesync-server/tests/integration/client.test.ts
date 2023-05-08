import jwt from 'jsonwebtoken'
import { expect } from 'chai'
import { v4 as uuidv4 } from 'uuid'
import { Y } from '@firesync/client'
import { testWrapper, tryUntil } from './utils'

describe('Client', () => {
  describe('reconnection logic', () => {
    test(
      'should reconnect if wantToBeConnected',
      testWrapper({}, async ({ docKey, client, server }) => {
        server.terminateDocConnections(docKey)

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(client.stats.disconnectsCount).to.be.greaterThan(0)
        })

        // Make sure we reconnect
        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
          expect(client.stats.connectsCount).to.be.greaterThan(1)
        })
      })
    )

    test(
      'should not reconnect if not wantToBeConnected',
      testWrapper({}, async ({ client }) => {
        // Sets wantToBeConnected = false
        client.disconnect()

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(client.stats.disconnectsCount).to.be.greaterThan(0)
        })

        // Shouldn't be trying to reconnect
        await tryUntil(async () => {
          expect(client.stats.nextConnectionAttemptDelay).to.equal(null)
          expect(client.stats.nextConnectionAttemptTimeout).to.equal(undefined)
          expect(client.connected).to.equal(false)
        })
      })
    )

    test(
      'should back off on reconnection attempts up to maxConnectionAttemptDelay',
      testWrapper({}, async ({ docKey, client, server }) => {
        await server.refuseConnections()
        await server.terminateDocConnections(docKey)

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(client.stats.disconnectsCount).to.be.greaterThan(0)
        })

        // Try to reconnect multiple times up to maxConnectionAttemptDelay
        await tryUntil(async () => {
          expect(client.stats.connectionAttempts).to.be.greaterThan(2)
          expect(client.stats.nextConnectionAttemptDelay).to.equal(
            client.stats.maxConnectionAttemptDelay
          )
        })
      })
    )

    test(
      'should reconnect if first client attempt fails',
      testWrapper({ connect: false }, async ({ client, server }) => {
        await server.refuseConnections()

        client.connect()

        // Connect a few times
        await tryUntil(async () => {
          expect(client.stats.connectionAttempts).to.be.greaterThan(2)
        })

        expect(client.connected).to.equal(false)

        await server.acceptConnections()

        // Check connected
        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
        })
      })
    )

    test(
      'should stop trying to reconnect after a while',
      testWrapper({}, async ({ ydoc, docKey, client, server }) => {
        client.connectionConfig({ stopConnectionAttemptsAfter: 100 }) // ms

        // Disconnect
        server.refuseConnections()
        server.terminateDocConnections(docKey)

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(client.stats.disconnectsCount).to.be.greaterThan(0)
        })

        // Shouldn't be trying to reconnect after a while
        await tryUntil(async () => {
          expect(client.stats.connectionAttempts).to.be.greaterThan(2)
          expect(client.stats.nextConnectionAttemptDelay).to.equal(null)
          expect(client.stats.nextConnectionAttemptTimeout).to.equal(undefined)
          expect(client.connected).to.equal(false)
        })

        // Should still reconnect after updates
        server.acceptConnections()
        ydoc.getText('t').insert(0, 'foo')

        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
        })
      })
    )

    test(
      'should reconnect soon on an update from the doc',
      testWrapper({}, async ({ ydoc, docKey, client, server }) => {
        await server.refuseConnections()
        await server.terminateDocConnections(docKey)

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(client.stats.disconnectsCount).to.be.greaterThan(0)
        })

        // Try to reconnect multiple times up to maxConnectionAttemptDelay
        await tryUntil(async () => {
          expect(client.stats.connectionAttempts).to.be.greaterThan(2)
          expect(client.stats.nextConnectionAttemptDelay).to.equal(
            client.stats.maxConnectionAttemptDelay
          )
        })

        // Should reduce the delay after an update comes in
        ydoc.getText('t').insert(0, 'foo')
        await tryUntil(async () => {
          expect(client.stats.nextConnectionAttemptDelay).to.be.lessThan(
            client.stats.maxConnectionAttemptDelay
          )
        })
      })
    )

    // Hard to test, skipping for now
    it.todo(
      'should delay the initial reconnect based on time since last activity'
    )

    // TODO: See https://github.com/firesync-org/firesync/issues/83
    it.todo(
      'should reconnect soon when the browser window is made visible again'
    )
  })

  describe('updates', () => {
    test(
      'should not send any updates before syncing is done',
      testWrapper({ subscribe: false }, async ({ docKey, ydoc, client }) => {
        const text = ydoc.getText('t')
        text.insert(0, 'foo')

        client.chaosMonkey.syncAfterSubscribe = false
        client.subscribeYDoc(docKey, { ydoc })

        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
          expect(client.updatesSentCount).to.equal(0)
          expect(client.isSubscribed(docKey)).to.equal(true)
        })

        // Do initial sync
        client.__FOR_TESTING_ONLY_DO_NOT_USE.sendStateVector(docKey)
        await tryUntil(async () => {
          expect(client.updatesSentCount).to.equal(1)
        })

        text.insert(0, 'bar')
        await tryUntil(async () => {
          expect(client.updatesSentCount).to.equal(2)
        })
      })
    )

    test(
      'pending and inflight updates',
      testWrapper({}, async ({ ydoc, client }) => {
        expect(client.hasPendingUpdates).to.equal(false)
        expect(client.hasInflightUpdates).to.equal(false)

        // Should immediately send if no pending updates
        const text = ydoc.getText('t')
        text.insert(0, 'foo')
        expect(client.hasPendingUpdates).to.equal(false)
        expect(client.hasInflightUpdates).to.equal(true)

        // Next update goes into pending
        text.insert(3, 'bar')
        expect(client.hasPendingUpdates).to.equal(true)
        expect(client.hasInflightUpdates).to.equal(true)

        // Should eventually flush all updates
        await tryUntil(async () => {
          expect(client.hasPendingUpdates).to.equal(false)
          expect(client.hasInflightUpdates).to.equal(false)
        })
      })
    )
  })

  describe('subscribing and unsubscribing', () => {
    test(
      'subscribing and immediately unsubscribing',
      testWrapper({ subscribe: false }, async ({ docKey, ydoc, client }) => {
        // This situation happens in React where useEffect fires twice in development
        // mode: https://beta.reactjs.org/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development
        // e.g.
        //
        //    useEffect(() => {
        //      firesync.client.subscribeYDoc(docKey, ydoc)
        //      return () => {
        //        firesync.client.unsubscribe(docKey)
        //      }
        //    }, [])
        //
        // This will trigger the following in quick succession:
        //
        //   subscribe
        //   unsubscribe
        //   subscribe
        client.subscribeYDoc(docKey, { ydoc })
        client.unsubscribe(docKey)
        client.subscribeYDoc(docKey, { ydoc })

        await tryUntil(async () => {
          expect(client.isSubscribed(docKey)).to.equal(true)
        })

        // Also do the final unsuscribe to make sure the above had time to
        // fully play out and trigger any double subscribe or other errors
        client.unsubscribe(docKey)

        await tryUntil(async () => {
          expect(client.isSubscribed(docKey)).to.equal(false)
        })
      })
    )

    test(
      'subscribing and unsubscribing',
      testWrapper({ subscribe: false }, async ({ docKey, ydoc, client }) => {
        client.subscribeYDoc(docKey, { ydoc })
        expect(client.isSubscribing(docKey)).to.equal(true)

        await tryUntil(async () => {
          expect(client.isSubscribed(docKey)).to.equal(true)
        })

        client.unsubscribe(docKey)
        expect(client.isUnsubscribing(docKey)).to.equal(true)

        await tryUntil(async () => {
          expect(client.isUnsubscribed(docKey)).to.equal(true)
        })

        // Do it again to check state has reset properly
        client.subscribeYDoc(docKey, { ydoc })
        expect(client.isSubscribing(docKey)).to.equal(true)

        await tryUntil(async () => {
          expect(client.isSubscribed(docKey)).to.equal(true)
        })

        client.unsubscribe(docKey)
        expect(client.isUnsubscribing(docKey)).to.equal(true)

        await tryUntil(async () => {
          expect(client.isUnsubscribed(docKey)).to.equal(true)
        })
      })
    )
  })

  describe('multiple docs', () => {
    test(
      'subscribing to a new doc when already connected to an old doc',
      testWrapper(
        { connect: false },
        async ({ docKey: docKey1, client: clientA, server, secret }) => {
          const docKey2 = uuidv4()
          const token = jwt.sign(
            {
              docs: {
                [docKey1]: 'write',
                [docKey2]: 'write'
              }
            },
            secret
          )
          clientA.token = token

          clientA.connect()
          const ydoc1a = clientA.subscribeYDoc(docKey1)
          const ydoc2a = clientA.subscribeYDoc(docKey2)

          // Wait till subscribed
          await tryUntil(async () => {
            expect(clientA.isSubscribed(docKey1)).to.equal(true)
            expect(clientA.isSubscribed(docKey2)).to.equal(true)
          })

          ydoc1a.getText('').insert(0, 'foo')
          ydoc2a.getText('').insert(0, 'bar')

          // Should sync to other client subscribed to both docs
          const ydoc1b = new Y.Doc()
          const ydoc2b = new Y.Doc()
          const clientB = server.getClient({ token })
          clientB.subscribeYDoc(docKey1, { ydoc: ydoc1b })
          clientB.subscribeYDoc(docKey2, { ydoc: ydoc2b })

          await tryUntil(async () => {
            expect(ydoc1b.getText('').toJSON()).to.equal('foo')
            expect(ydoc2b.getText('').toJSON()).to.equal('bar')
          })
        }
      )
    )

    test(
      'subscribing to a new doc when not yet connected',
      testWrapper(
        {
          connect: false
        },
        async ({
          ydoc: ydoc1a,
          docKey: docKey1,
          client: clientA,
          server,
          secret
        }) => {
          const docKey2 = uuidv4()
          const ydoc2a = new Y.Doc()
          const token = jwt.sign(
            {
              docs: {
                [docKey1]: 'write',
                [docKey2]: 'write'
              }
            },
            secret
          )
          clientA.token = token

          clientA.subscribeYDoc(docKey1, { ydoc: ydoc1a })
          clientA.subscribeYDoc(docKey2, { ydoc: ydoc2a })

          // Connect after subscribing
          clientA.connect()

          // Wait till subscribed
          await tryUntil(async () => {
            expect(clientA.isSubscribed(docKey1)).to.equal(true)
            expect(clientA.isSubscribed(docKey2)).to.equal(true)
          })

          ydoc1a.getText('').insert(0, 'foo')
          ydoc2a.getText('').insert(0, 'bar')

          // Should sync to other client subscribed to both docs
          const ydoc1b = new Y.Doc()
          const ydoc2b = new Y.Doc()
          const clientB = server.getClient({ token })
          clientB.subscribeYDoc(docKey1, { ydoc: ydoc1b })
          clientB.subscribeYDoc(docKey2, { ydoc: ydoc2b })

          await tryUntil(async () => {
            expect(ydoc1b.getText('').toJSON()).to.equal('foo')
            expect(ydoc2b.getText('').toJSON()).to.equal('bar')
          })
        }
      )
    )

    test(
      'updates to doc before finished subscribing',
      testWrapper(
        { subscribe: false },
        async ({ client: clientA, docKey, ydoc: ydocA, server, token }) => {
          // Subscribe and send updates before server has acknowledged
          clientA.subscribeYDoc(docKey, { ydoc: ydocA })
          expect(clientA.isSubscribed(docKey)).to.equal(false)
          ydocA.getText('').insert(0, 'foo')

          // Wait till subscribed
          await tryUntil(async () => {
            expect(clientA.isSubscribed(docKey)).to.equal(true)
          })

          // Should synced to other client
          const ydocB = new Y.Doc()
          const clientB = server.getClient({ token })
          clientB.subscribeYDoc(docKey, { ydoc: ydocB })

          await tryUntil(async () => {
            expect(ydocB.getText('').toJSON()).to.equal('foo')
          })
        }
      )
    )
  })
})
