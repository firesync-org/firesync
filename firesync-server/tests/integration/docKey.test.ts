import jwt from 'jsonwebtoken'
import { expect } from 'chai'
import { testWrapper, tryUntil } from './utils'
import { BadRequestError } from '@firesync/client'

describe('docKey', () => {
  test(
    'invalid keys',
    testWrapper({ connect: false }, async ({ server, secret }) => {
      const invalidDocKeys = [
        // Bad Chars
        '$%&',
        '🧵➰🧶𓍼😎🪢𓎖🪡⛓🎈🥳⛓️',
        // Too short
        'aa',
        // Doesn't start with letter or number
        '-aaa',
        // Doesn't end with letter or number
        'aaa-',
        // Too long
        Array(1025).fill('a').join('')
      ]

      for (const docKey of invalidDocKeys) {
        const token = jwt.sign(
          {
            docs: {
              [docKey]: 'write'
            }
          },
          secret
        )

        const client = server.getClient({ token })
        await tryUntil(async () => {
          expect(client.connected).to.equal(true)
        })

        let error: Error | undefined
        client.on('error', (_error) => {
          error = _error
        })

        const ydoc = client.subscribeYDoc(docKey)
        ydoc.getText('').insert(0, 'foo')

        await tryUntil(async () => {
          expect(error).is.instanceOf(BadRequestError)
          expect(error?.message).to.match(/Invalid doc key format/)
        })
      }
    })
  )
})
