import { expect } from 'chai'
import { Y, Connection } from 'firesync-client'
import { getClient } from './getClient'
import { ServerClient } from './serverClient'
import { tryUntil } from './tryUntil'
import { v4 as uuidv4 } from 'uuid'

const port = 5000

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
    port: number
  }) => Promise<void>
) {
  return async function () {
    const host = `${process.env.PROJECT_NAME}.api.localtest.me`
    const serverClient = new ServerClient(`https://${host}`)

    await serverClient.createUser()

    const docKey = uuidv4()
    await serverClient.createDoc(docKey)
    const ydoc = new Y.Doc()

    const { connection } = getClient({
      host,
      connect,
      cookie: serverClient.cookie
    })

    connection.maxConnectionAttemptDelay = 30
    connection.minConnectionAttemptDelay = 1
    connection.soonConnectionAttemptDelayThreshold = 5

    if (connect) {
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
      await testMethod({ ydoc, docKey, connection, serverClient, port })
    } catch (error) {
      await cleanUp()
      throw error
    }

    await cleanUp()
  }
}
