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
    connection: Connection
    serverClient: ServerClient
    session: Session
    client: Firesync
  }) => Promise<void>
) {
  return async function () {
    const { connection, client } = getClient({
      connect: false // Wait until we have a user and session
    })

    connection.maxConnectionAttemptDelay = 30
    connection.minConnectionAttemptDelay = 1
    connection.soonConnectionAttemptDelayThreshold = 5

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
      connection.connect()

      await tryUntil(async () => {
        expect(connection.connected).to.equal(true)
      })

      if (subscribe) {
        connection.subscribe(docKey, ydoc)
        await tryUntil(async () => {
          expect(connection.isSubscribed(docKey)).to.equal(true)
          expect(connection.hasSentInitialUpdate(docKey)).to.equal(true)
        })
      }
    }

    const cleanUp = async () => {
      connection.disconnect()
      serverClient.acceptConnections()
    }

    try {
      await testMethod({
        ydoc,
        docKey,
        connection,
        serverClient,
        session: client.session,
        client
      })
    } catch (error) {
      await cleanUp()
      throw error
    }

    await cleanUp()
  }
}
