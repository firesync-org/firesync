import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { testWrapper, tryUntil } from './utils'
import { AuthError } from '@firesync/client'

chai.use(chaiAsPromised)

describe('Auth', () => {
  describe('no session', () => {
    test(
      'client.isLogged() in should return false',
      testWrapper({ connect: false }, async ({ client }) => {
        client.session.clearSession()
        expect(await client.isLoggedIn()).to.equal(false)
      })
    )

    test(
      'client.getUser() should throw AuthError',
      testWrapper({ connect: false }, async ({ client }) => {
        client.session.clearSession()
        await expect(client.getUser()).to.be.rejectedWith(AuthError)
      })
    )

    test(
      'client.connection.connect() should throw AuthError',
      testWrapper({ connect: false }, async ({ client }) => {
        client.session.clearSession()

        let error: Error | null
        client.connection.on('error', (_error) => {
          error = _error
        })

        client.connection.connect()

        await tryUntil(async () => {
          expect(error).is.instanceOf(AuthError)
        })
      })
    )
  })

  describe('revoked session', () => {
    test.todo('client.isLogged() in should return false')

    test.todo('client.getUser() should throw AuthError')

    test.todo('client.connection.connect() should throw AuthError')
  })

  describe('expired refresh token', () => {
    test.todo('client.isLogged() in should return false')

    test.todo('client.getUser() should throw AuthError')

    test.todo('client.connection.connect() should throw AuthError')
  })

  describe('valid session', () => {
    test.todo('client.isLogged() in should return true')

    test.todo('client.getUser() should return user')

    test.todo('client.connection.connect() should connect')
  })

  describe('revoking tokens', () => {
    test.todo('access token should no longer be valid')

    test.todo('refresh token should no longer be valid')

    test.todo(
      'using old refresh token should revoke current refresh and access tokens'
    )
  })

  describe('refreshing tokens', () => {
    test.todo('expired access token should be automatically refreshed')
  })
})
