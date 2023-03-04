import { expect } from 'chai'
import { v4 as uuidv4 } from 'uuid'
import { Y } from '@firesync/client'
import { getClient, testWrapper, tryUntil } from './utils'

describe('Client', () => {
  describe('reconnection logic', () => {
    test(
      'should reconnect if wantToBeConnected',
      testWrapper({}, async ({ docKey, connection, serverClient }) => {
        serverClient.terminateDocConnections(docKey)

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(connection.disconnectsCount).to.be.greaterThan(0)
        })

        // Make sure we reconnect
        await tryUntil(async () => {
          expect(connection.connected).to.equal(true)
          expect(connection.connectsCount).to.be.greaterThan(1)
        })
      })
    )

    test(
      'should not reconnect if not wantToBeConnected',
      testWrapper({}, async ({ connection }) => {
        // Sets wantToBeConnected = false
        connection.disconnect()

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(connection.disconnectsCount).to.be.greaterThan(0)
        })

        // Shouldn't be trying to reconnect
        await tryUntil(async () => {
          expect(connection.nextConnectionAttemptDelay).to.equal(null)
          expect(connection.nextConnectionAttemptTimeout).to.equal(undefined)
          expect(connection.connected).to.equal(false)
        })
      })
    )

    test(
      'should back off on reconnection attempts up to maxConnectionAttemptDelay',
      testWrapper({}, async ({ docKey, connection, serverClient }) => {
        await serverClient.refuseConnections()
        await serverClient.terminateDocConnections(docKey)

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(connection.disconnectsCount).to.be.greaterThan(0)
        })

        // Try to reconnect multiple times up to maxConnectionAttemptDelay
        await tryUntil(async () => {
          expect(connection.connectionAttempts).to.be.greaterThan(2)
          expect(connection.nextConnectionAttemptDelay).to.equal(
            connection.maxConnectionAttemptDelay
          )
        })
      })
    )

    test(
      'should reconnect if first connection attempt fails',
      testWrapper({ connect: false }, async ({ connection, serverClient }) => {
        await serverClient.refuseConnections()

        connection.connect()

        // Connect a few times
        await tryUntil(async () => {
          expect(connection.connectionAttempts).to.be.greaterThan(2)
        })

        expect(connection.connected).to.equal(false)

        await serverClient.acceptConnections()

        // Check connected
        await tryUntil(async () => {
          expect(connection.connected).to.equal(true)
        })
      })
    )

    test(
      'should stop trying to reconnect after a while',
      testWrapper({}, async ({ ydoc, docKey, connection, serverClient }) => {
        connection.stopConnectionAttemptsAfter = 100 // ms

        // Disconnect
        serverClient.refuseConnections()
        serverClient.terminateDocConnections(docKey)

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(connection.disconnectsCount).to.be.greaterThan(0)
        })

        // Shouldn't be trying to reconnect after a while
        await tryUntil(async () => {
          expect(connection.connectionAttempts).to.be.greaterThan(2)
          expect(connection.nextConnectionAttemptDelay).to.equal(null)
          expect(connection.nextConnectionAttemptTimeout).to.equal(undefined)
          expect(connection.connected).to.equal(false)
        })

        // Should still reconnect after updates
        serverClient.acceptConnections()
        ydoc.getText('t').insert(0, 'foo')

        await tryUntil(async () => {
          expect(connection.connected).to.equal(true)
        })
      })
    )

    test(
      'should reconnect soon on an update from the doc',
      testWrapper({}, async ({ ydoc, docKey, connection, serverClient }) => {
        await serverClient.refuseConnections()
        await serverClient.terminateDocConnections(docKey)

        // Make sure we have disconnected
        await tryUntil(async () => {
          expect(connection.disconnectsCount).to.be.greaterThan(0)
        })

        // Try to reconnect multiple times up to maxConnectionAttemptDelay
        await tryUntil(async () => {
          expect(connection.connectionAttempts).to.be.greaterThan(2)
          expect(connection.nextConnectionAttemptDelay).to.equal(
            connection.maxConnectionAttemptDelay
          )
        })

        // Should reduce the delay after an update comes in
        ydoc.getText('t').insert(0, 'foo')
        await tryUntil(async () => {
          expect(connection.nextConnectionAttemptDelay).to.be.lessThan(
            connection.maxConnectionAttemptDelay
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
      testWrapper(
        { subscribe: false },
        async ({ docKey, ydoc, connection }) => {
          const text = ydoc.getText('t')
          text.insert(0, 'foo')

          connection.chaosMonkey.syncAfterSubscribe = false
          connection.subscribe(docKey, ydoc)

          await tryUntil(async () => {
            expect(connection.connected).to.equal(true)
            expect(connection.updatesSentCount).to.equal(0)
            expect(connection.isSubscribed(docKey)).to.equal(true)
          })

          // Do initial sync
          connection.sendStateVector(docKey)
          await tryUntil(async () => {
            expect(connection.updatesSentCount).to.equal(1)
          })

          text.insert(0, 'bar')
          await tryUntil(async () => {
            expect(connection.updatesSentCount).to.equal(2)
          })
        }
      )
    )

    test(
      'pending and inflight updates',
      testWrapper({}, async ({ ydoc, connection }) => {
        expect(connection.hasPendingUpdates).to.equal(false)
        expect(connection.hasInflightUpdates).to.equal(false)

        // Should immediately send if no pending updates
        const text = ydoc.getText('t')
        text.insert(0, 'foo')
        expect(connection.hasPendingUpdates).to.equal(false)
        expect(connection.hasInflightUpdates).to.equal(true)

        // Next update goes into pending
        text.insert(3, 'bar')
        expect(connection.hasPendingUpdates).to.equal(true)
        expect(connection.hasInflightUpdates).to.equal(true)

        // Should eventually flush all updates
        await tryUntil(async () => {
          expect(connection.hasPendingUpdates).to.equal(false)
          expect(connection.hasInflightUpdates).to.equal(false)
        })
      })
    )
  })

  describe('subscribing and unsubscribing', () => {
    test(
      'subscribing and immediately unsubscribing',
      testWrapper(
        { subscribe: false },
        async ({ docKey, ydoc, connection }) => {
          // This situation happens in React where useEffect fires twice in development
          // mode: https://beta.reactjs.org/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development
          // e.g.
          //
          //    useEffect(() => {
          //      firesync.connection.subscribe(docKey, ydoc)
          //      return () => {
          //        firesync.connection.unsubscribe(docKey)
          //      }
          //    }, [])
          //
          // This will trigger the following in quick succession:
          //
          //   subscribe
          //   unsubscribe
          //   subscribe
          connection.subscribe(docKey, ydoc)
          connection.unsubscribe(docKey)
          connection.subscribe(docKey, ydoc)

          await tryUntil(async () => {
            expect(connection.isSubscribed(docKey)).to.equal(true)
          })

          // Also do the final unsuscribe to make sure the above had time to
          // fully play out and trigger any double subscribe or other errors
          connection.unsubscribe(docKey)

          await tryUntil(async () => {
            expect(connection.isSubscribed(docKey)).to.equal(false)
          })
        }
      )
    )

    test(
      'subscribing and unsubscribing',
      testWrapper(
        { subscribe: false },
        async ({ docKey, ydoc, connection }) => {
          connection.subscribe(docKey, ydoc)
          expect(connection.isSubscribing(docKey)).to.equal(true)

          await tryUntil(async () => {
            expect(connection.isSubscribed(docKey)).to.equal(true)
          })

          connection.unsubscribe(docKey)
          expect(connection.isUnsubscribing(docKey)).to.equal(true)

          await tryUntil(async () => {
            expect(connection.isUnsubscribed(docKey)).to.equal(true)
          })

          // Do it again to check state has reset properly
          connection.subscribe(docKey, ydoc)
          expect(connection.isSubscribing(docKey)).to.equal(true)

          await tryUntil(async () => {
            expect(connection.isSubscribed(docKey)).to.equal(true)
          })

          connection.unsubscribe(docKey)
          expect(connection.isUnsubscribing(docKey)).to.equal(true)

          await tryUntil(async () => {
            expect(connection.isUnsubscribed(docKey)).to.equal(true)
          })
        }
      )
    )
  })

  describe('multiple docs', () => {
    test(
      'subscribing to a new doc when already connected to an old doc',
      testWrapper(
        {},
        async ({
          ydoc: ydoc1a,
          docKey: docKey1,
          connection: connectionA,
          serverClient,
          session
        }) => {
          const docKey2 = uuidv4()
          await serverClient.createDoc(docKey2)
          const ydoc2a = connectionA.subscribe(docKey2)

          // Wait till subscribed
          await tryUntil(async () => {
            expect(connectionA.isSubscribed(docKey1)).to.equal(true)
            expect(connectionA.isSubscribed(docKey2)).to.equal(true)
          })

          ydoc1a.getText('').insert(0, 'foo')
          ydoc2a.getText('').insert(0, 'bar')

          // Should sync to other connection subscribed to both docs
          const ydoc1b = new Y.Doc()
          const ydoc2b = new Y.Doc()
          const { connection: connectionB } = getClient({
            session
          })
          connectionB.subscribe(docKey1, ydoc1b)
          connectionB.subscribe(docKey2, ydoc2b)

          await tryUntil(async () => {
            expect(ydoc1b.getText('').toJSON()).to.equal('foo')
            expect(ydoc2b.getText('').toJSON()).to.equal('bar')
          })

          connectionB.disconnect()
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
          connection: connectionA,
          serverClient,
          session
        }) => {
          const docKey2 = uuidv4()
          const ydoc2a = new Y.Doc()
          await serverClient.createDoc(docKey2)

          connectionA.subscribe(docKey1, ydoc1a)
          connectionA.subscribe(docKey2, ydoc2a)

          // Connect after subscribing
          connectionA.connect()

          // Wait till subscribed
          await tryUntil(async () => {
            expect(connectionA.isSubscribed(docKey1)).to.equal(true)
            expect(connectionA.isSubscribed(docKey2)).to.equal(true)
          })

          ydoc1a.getText('').insert(0, 'foo')
          ydoc2a.getText('').insert(0, 'bar')

          // Should sync to other connection subscribed to both docs
          const ydoc1b = new Y.Doc()
          const ydoc2b = new Y.Doc()
          const { connection: connectionB } = getClient({
            session
          })
          connectionB.subscribe(docKey1, ydoc1b)
          connectionB.subscribe(docKey2, ydoc2b)

          await tryUntil(async () => {
            expect(ydoc1b.getText('').toJSON()).to.equal('foo')
            expect(ydoc2b.getText('').toJSON()).to.equal('bar')
          })

          connectionB.disconnect()
        }
      )
    )

    test(
      'updates to doc before finished subscribing',
      testWrapper(
        { subscribe: false },
        async ({ connection: connectionA, docKey, ydoc: ydocA, session }) => {
          // Subscribe and send updates before server has acknowledged
          connectionA.subscribe(docKey, ydocA)
          expect(connectionA.isSubscribed(docKey)).to.equal(false)
          ydocA.getText('').insert(0, 'foo')

          // Wait till subscribed
          await tryUntil(async () => {
            expect(connectionA.isSubscribed(docKey)).to.equal(true)
          })

          // Should synced to other connection
          const ydocB = new Y.Doc()
          const { connection: connectionB } = getClient({
            session
          })
          connectionB.subscribe(docKey, ydocB)

          await tryUntil(async () => {
            expect(ydocB.getText('').toJSON()).to.equal('foo')
          })

          connectionB.disconnect()
        }
      )
    )
  })
})
