/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { expect } from 'chai'
import { encodeMessage, MessageType } from '../../src/shared/protocol'
import { tryUntil, testWrapper } from './utils'

describe('Protocol Errors', () => {
  test(
    'send update with a session doc id that is not subscribed',
    testWrapper({}, async ({ client }) => {
      expect(client.stats.connectsCount).to.equal(1)

      let error: Error | null
      client.on('error', (_error) => {
        error = _error
      })

      client.__FOR_TESTING_ONLY_DO_NOT_USE.send(
        encodeMessage({
          messageType: MessageType.UPDATE,
          updateId: 42,
          updates: new Map([['42', new Uint8Array()]])
        })
      )

      await tryUntil(async () => {
        expect(error?.name).to.equal('BadRequestError')
        expect(client.stats.connectsCount).to.equal(2)
      })
    })
  )

  test(
    'send state vector with a session doc id that is not subscribed',
    testWrapper({}, async ({ client }) => {
      expect(client.stats.connectsCount).to.equal(1)

      let error: Error | null
      client.on('error', (_error) => {
        error = _error
      })

      client.__FOR_TESTING_ONLY_DO_NOT_USE.send(
        encodeMessage({
          messageType: MessageType.SYNC_STATE_VECTOR,
          sessionDocId: '42', // Doesn't exist
          stateVector: new Uint8Array()
        })
      )

      await tryUntil(async () => {
        expect(error?.name).to.equal('BadRequestError')
        expect(client.stats.connectsCount).to.equal(2)
      })
    })
  )

  test(
    'with an unrecognised message type',
    testWrapper({}, async ({ client }) => {
      expect(client.stats.connectsCount).to.equal(1)

      let error: Error | null
      client.on('error', (_error) => {
        error = _error
      })

      client.__FOR_TESTING_ONLY_DO_NOT_USE.send(
        encodeMessage({
          messageType: 999
        } as any)
      )

      await tryUntil(async () => {
        expect(error?.name).to.equal('MessageEncodingError')
        expect(client.stats.connectsCount).to.equal(2)
      })
    })
  )

  test(
    'with a badly encoded message',
    testWrapper({}, async ({ client }) => {
      expect(client.stats.connectsCount).to.equal(1)

      let error: Error | null
      client.on('error', (_error) => {
        error = _error
      })

      client.__FOR_TESTING_ONLY_DO_NOT_USE.send(new Uint8Array())

      await tryUntil(async () => {
        expect(error?.name).to.equal('MessageEncodingError')
        expect(client.stats.connectsCount).to.equal(2)
      })
    })
  )
})
