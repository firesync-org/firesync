import { expect } from 'chai'
import { Y, Connection, Session, Api } from '@firesync/client'
import { getClient } from './getClient'
import { ServerClient } from './serverClient'
import { tryUntil } from './tryUntil'
import { v4 as uuidv4 } from 'uuid'

const api = new Api('http://localhost:5000')

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
  }) => Promise<void>
) {
  return async function () {
    const url = `http://localhost:5000`
    const session = new Session(api)

    const serverClient = new ServerClient(url, session)

    await serverClient.createUserAndLogin()

    const docKey = uuidv4()
    await serverClient.createDoc(docKey)
    const ydoc = new Y.Doc()

    const { connection } = getClient({
      connect,
      session
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
      await testMethod({ ydoc, docKey, connection, serverClient, session })
    } catch (error) {
      await cleanUp()
      throw error
    }

    await cleanUp()
  }
}
