import crypto from 'crypto'
import { expect } from 'chai'
import FireSync, { Y } from '@firesync/client'
import { DebugClient } from './debugClient'
import { tryUntil } from './tryUntil'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'

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
    client: FireSync
    secret: string
    token: string
  }) => Promise<void>
) {
  return async function () {
    const server = new DebugClient(`http://localhost:5000`)

    const secret = crypto.randomBytes(32).toString('hex')
    await server.setConfig({ jwtAuthSecrets: [secret] })

    const docKey = uuidv4()
    const ydoc = new Y.Doc()

    const token = jwt.sign(
      {
        docs: {
          [docKey]: 'write'
        }
      },
      secret
    )
    const client = server.getClient({ token, connect })

    client.connectionConfig({
      maxConnectionAttemptDelay: 30,
      minConnectionAttemptDelay: 1,
      soonConnectionAttemptDelayThreshold: 5
    })

    client.on('error', () => {
      // stop lots of expected errors being logged
    })

    if (connect) {
      await tryUntil(async () => {
        expect(client.connected).to.equal(true)
      })

      if (subscribe) {
        client.subscribe(docKey, ydoc)
        await tryUntil(async () => {
          expect(client.isSubscribed(docKey)).to.equal(true)
          expect(client.hasSentInitialUpdate(docKey)).to.equal(true)
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
      server.clients.forEach((client) => client.disconnect())
    }

    try {
      await testMethod({
        ydoc,
        docKey,
        server,
        client,
        secret,
        token
      })
    } catch (error) {
      await cleanUp()
      throw error
    }

    await cleanUp()
  }
}
