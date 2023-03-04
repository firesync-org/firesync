import { expect } from 'chai'
import Firesync, { Y, Connection, Session } from '@firesync/client'
import { getClient } from './getClient'
import { ServerClient } from './serverClient'
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
    serverClient: ServerClient
    client: Firesync
  }) => Promise<void>
) {
  return async function () {
    const client = getClient({
      connect: false // Wait until we have a user and session
    })

    client.connection.maxConnectionAttemptDelay = 30
    client.connection.minConnectionAttemptDelay = 1
    client.connection.soonConnectionAttemptDelayThreshold = 5

    const serverClient = new ServerClient(
      `http://localhost:5000`,
      client.session
    )

    const { accessToken, refreshToken } = await serverClient.createUser()
    client.session.setSession({ accessToken, refreshToken })

    const docKey = uuidv4()
    await serverClient.createDoc(docKey)
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
      client.connection.disconnect()
      serverClient.acceptConnections()
    }

    try {
      await testMethod({
        ydoc,
        docKey,
        serverClient,
        client
      })
    } catch (error) {
      await cleanUp()
      throw error
    }

    await cleanUp()
  }
}
