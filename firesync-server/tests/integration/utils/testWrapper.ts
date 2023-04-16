import { expect } from 'chai'
import Firesync, { Y } from '@firesync/client'
import { DebugClient } from './debugClient'
import { tryUntil } from './tryUntil'
import { v4 as uuidv4 } from 'uuid'

export const testWrapper = function (
  {
    connect = true,
    subscribe = true
  }: {
    connect?: boolean
    subscribe?: boolean
  } = {},
  testMethod: (data: {
    ydoc: Y.Doc
    docKey: string
    server: DebugClient
    client: Firesync
  }) => Promise<void>
) {
  return async function () {
    const server = new DebugClient(`http://localhost:5000`)

    const { client } = await server.createUserAndClient()

    client.connection.maxConnectionAttemptDelay = 30
    client.connection.minConnectionAttemptDelay = 1
    client.connection.soonConnectionAttemptDelayThreshold = 5

    client.connection.on('error', () => {
      // stop lots of expected errors being logged
    })

    const docKey = uuidv4()
    await client.createDoc(docKey)
    const ydoc = new Y.Doc()

    if (connect) {
      client.connection.connect()

      await tryUntil(async () => {
        expect(client.connection.connected).to.equal(true)
      })

      if (subscribe) {
        client.connection.subscribe(docKey, ydoc)
        await tryUntil(async () => {
          expect(client.connection.isSubscribed(docKey)).to.equal(true)
          expect(client.connection.hasSentInitialUpdate(docKey)).to.equal(true)
        })
      }
    }

    const cleanUp = async () => {
      await server.setConfig({
        // Reset to defaults
        packAfterNUpdates: 64,
        waitSecondsBeforePacking: 60
      })
      await server.acceptConnections()
      server.clients.forEach((client) => client.connection.disconnect())
    }

    try {
      await testMethod({
        ydoc,
        docKey,
        server,
        client
      })
    } catch (error) {
      await cleanUp()
      throw error
    }

    await cleanUp()
  }
}
