import jwt from 'jsonwebtoken'
import { expect } from 'chai'

import { testWrapper, tryUntil } from './utils'
import { AuthError, BadRequestError } from '@firesync/client'

describe('Auth', () => {
  test(
    'valid token can write doc',
    testWrapper(
      { connect: false },
      async ({ client, docKey, server, secret }) => {
        client.token = jwt.sign(
          {
            docs: {
              [docKey]: 'write'
            }
          },
          secret
        )

        client.connect()
        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
        })

        const ydoc = client.subscribe(docKey)
        ydoc.getText('').insert(0, 'foo')

        // Should be able to write
        await tryUntil(async () => {
          const updates = await server.getDocUpdates(docKey)
          expect(updates.length).to.equal(1)
        })
      }
    )
  )

  test(
    'valid token with read permission cannot write',
    testWrapper(
      { connect: false },
      async ({ client, docKey, server, secret }) => {
        client.token = jwt.sign(
          {
            docs: {
              [docKey]: 'read'
            }
          },
          secret
        )

        client.connect()
        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
        })

        let error: Error | undefined
        client.on('error', (_error) => {
          error = _error
        })

        const ydoc = client.subscribe(docKey)
        ydoc.getText('').insert(0, 'foo')

        await tryUntil(async () => {
          expect(error).is.instanceOf(AuthError)
          expect(error?.message).to.match(/Not authorized to write doc/)
        })

        // Should not have processed update
        await tryUntil(async () => {
          const updates = await server.getDocUpdates(docKey)
          expect(updates.length).to.equal(0)
        })
      }
    )
  )

  test(
    'valid token with read permission can read',
    testWrapper({}, async ({ client, docKey, server, secret, ydoc }) => {
      ydoc.getText('a').insert(0, 'hello world')

      const token = jwt.sign(
        {
          docs: {
            [docKey]: 'read'
          }
        },
        secret
      )
      const readOnlyClient = server.getClient({ token })

      readOnlyClient.connect()
      const readOnlyYDoc = client.subscribe(docKey)

      await tryUntil(async () => {
        expect(readOnlyYDoc.getText('a').toJSON()).to.equal('hello world')
      })
    })
  )

  test(
    'valid token with no doc access',
    testWrapper(
      { connect: false },
      async ({ client, docKey, server, secret }) => {
        client.token = jwt.sign(
          {
            docs: {
              'wrong-doc-key': 'write'
            }
          },
          secret
        )

        client.connect()
        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
        })

        let error: Error | undefined
        client.on('error', (_error) => {
          error = _error
        })

        const ydoc = client.subscribe(docKey)
        ydoc.getText('').insert(0, 'foo')

        await tryUntil(async () => {
          expect(error).is.instanceOf(AuthError)
          expect(error?.message).to.match(/Not authorized to read doc/)
        })

        // Should not have processed update
        await tryUntil(async () => {
          const updates = await server.getDocUpdates(docKey)
          expect(updates.length).to.equal(0)
        })
      }
    )
  )

  test(
    'token with invalid secret',
    testWrapper({ connect: false }, async ({ client, docKey, server }) => {
      client.token = jwt.sign(
        {
          docs: {
            [docKey]: 'write'
          }
        },
        'wrong-secret'
      )

      client.connect()

      let error: Error | undefined
      client.on('error', (_error) => {
        error = _error
      })

      const ydoc = client.subscribe(docKey)
      ydoc.getText('').insert(0, 'foo')

      await tryUntil(async () => {
        expect(error).is.instanceOf(AuthError)
        expect(error?.message).to.match(/Invalid Auth Credentials/)
      })

      // Should not have processed update
      await tryUntil(async () => {
        const updates = await server.getDocUpdates(docKey)
        expect(updates.length).to.equal(0)
      })
    })
  )

  test(
    'multiple secrets',
    testWrapper({ connect: false }, async ({ client, docKey, server }) => {
      const secrets = ['one', 'two', 'three'] as const
      await server.setConfig({ jwtAuthSecrets: [...secrets] })

      client.token = jwt.sign(
        {
          docs: {
            [docKey]: 'write'
          }
        },
        secrets[2]
      )

      client.connect()
      await tryUntil(async () => {
        expect(client.connected).to.equal(true)
      })

      const ydoc = client.subscribe(docKey)
      ydoc.getText('').insert(0, 'foo')

      // Should be able to write
      await tryUntil(async () => {
        const updates = await server.getDocUpdates(docKey)
        expect(updates.length).to.equal(1)
      })
    })
  )

  test(
    'wildcards in docKey',
    testWrapper(
      { connect: false },
      async ({ client, docKey: baseDocKey, server, secret }) => {
        const docKey = `wildcard/${baseDocKey}`
        client.token = jwt.sign(
          {
            docs: {
              'wildcard/*': 'write'
            }
          },
          secret
        )

        client.connect()
        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
        })

        const ydoc = client.subscribe(docKey)
        ydoc.getText('').insert(0, 'foo')

        // Should be able to write
        await tryUntil(async () => {
          const updates = await server.getDocUpdates(docKey)
          expect(updates.length).to.equal(1)
        })
      }
    )
  )
})
