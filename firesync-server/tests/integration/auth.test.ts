import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { testWrapper, tryUntil } from './utils'
import { AuthError } from '@firesync/client'

chai.use(chaiAsPromised)

describe('Auth', () => {
  describe('valid session', () => {
    test(
      'client.isLoggedIn() in should return true',
      testWrapper({ connect: false }, async ({ client }) => {
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(true)
      })
    )

    test(
      'client.getUser() should return user',
      testWrapper({ connect: false }, async ({ client }) => {
        const { data: user } = await client.getUser()
        expect(typeof user?.userId).to.equal('string')
      })
    )

    test(
      'client.connection.connect() should connect',
      testWrapper({ connect: false }, async ({ client }) => {
        client.connection.connect()

        await tryUntil(async () => {
          expect(client.connection.connected).to.equal(true)
        })
      })
    )
  })

  describe('no session', () => {
    test(
      'client.isLoggedIn() in should return false',
      testWrapper({ connect: false }, async ({ client }) => {
        client.session.clearSession()
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(false)
      })
    )

    test(
      'client.getUser() should return AuthError',
      testWrapper({ connect: false }, async ({ client }) => {
        client.session.clearSession()
        const { data: user, error } = await client.getUser()
        expect(user).to.equal(null)
        expect(error instanceof AuthError).to.equal(true)
        expect(error?.message).to.match(
          /You are not logged in or your session has expired/
        )
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
          expect(error?.message).to.match(
            /You are not logged in or your session has expired/
          )
        })
      })
    )
  })

  describe('revoked session', () => {
    test(
      'client.isLoggedIn() in should return false',
      testWrapper({ connect: false }, async ({ client }) => {
        await client.revokeSession()
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(false)
      })
    )

    test(
      'client.getUser() should return AuthError',
      testWrapper({ connect: false }, async ({ client }) => {
        await client.revokeSession()
        const { data: user, error } = await client.getUser()
        expect(user).to.equal(null)
        expect(error instanceof AuthError).to.equal(true)
        expect(error?.message).to.match(
          /You are not logged in or your session has expired/
        )
      })
    )

    test(
      'client.connection.connect() should throw AuthError',
      testWrapper({ connect: false }, async ({ client }) => {
        await client.revokeSession()

        let error: Error | null
        client.connection.on('error', (_error) => {
          error = _error
        })

        client.connection.connect()

        await tryUntil(async () => {
          expect(error).is.instanceOf(AuthError)
          expect(error?.message).to.match(
            /You are not logged in or your session has expired/
          )
        })
      })
    )
  })

  describe('expired access and refresh tokens', () => {
    test(
      'client.isLoggedIn() in should return false',
      testWrapper({ connect: false }, async ({ client, server }) => {
        await server.expireSessionTokens({
          accessToken: client.session.accessToken,
          refreshToken: client.session.refreshToken
        })
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(false)
      })
    )

    test(
      'client.getUser() should throw AuthError',
      testWrapper({ connect: false }, async ({ client, server }) => {
        await server.expireSessionTokens({
          accessToken: client.session.accessToken,
          refreshToken: client.session.refreshToken
        })
        const { data: user, error } = await client.getUser()
        expect(user).to.equal(null)
        expect(error instanceof AuthError).to.equal(true)
        expect(error?.message).to.match(
          /You are not logged in or your session has expired/
        )
      })
    )

    test(
      'client.connection.connect() should throw AuthError',
      testWrapper({ connect: false }, async ({ client, server }) => {
        await server.expireSessionTokens({
          accessToken: client.session.accessToken,
          refreshToken: client.session.refreshToken
        })

        let error: Error | null
        client.connection.on('error', (_error) => {
          error = _error
        })

        client.connection.connect()

        await tryUntil(async () => {
          expect(error).is.instanceOf(AuthError)
          expect(error?.message).to.match(
            /You are not logged in or your session has expired/
          )
        })
      })
    )
  })

  describe('expired access token should refresh', () => {
    test(
      'client.isLoggedIn() in should return true',
      testWrapper({ connect: false }, async ({ client, server }) => {
        await server.expireSessionTokens({
          accessToken: client.session.accessToken
        })
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(true)
      })
    )

    test(
      'client.getUser() should return user',
      testWrapper({ connect: false }, async ({ client, server }) => {
        await server.expireSessionTokens({
          accessToken: client.session.accessToken
        })
        const { data: user } = await client.getUser()
        expect(typeof user?.userId).to.equal('string')
      })
    )

    test(
      'client.connection.connect() should connect',
      testWrapper({ connect: false }, async ({ client, server }) => {
        await server.expireSessionTokens({
          accessToken: client.session.accessToken
        })

        client.connection.connect()

        await tryUntil(async () => {
          expect(client.connection.connected).to.equal(true)
        })
      })
    )

    test(
      'refresh token should get refreshed',
      testWrapper({ connect: false }, async ({ client, server }) => {
        const oldRefreshToken = client.session.refreshToken
        await server.expireSessionTokens({
          accessToken: client.session.accessToken
        })
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(true)
        expect(client.session.refreshToken).to.not.equal(oldRefreshToken)
      })
    )

    test(
      'previous access token should no longer be valid',
      testWrapper({ connect: false }, async ({ client }) => {
        const previousAccessToken = client.session.accessToken

        await client.session.refreshAccessToken()
        const { data: loggedInCurrent } = await client.isLoggedIn()
        expect(loggedInCurrent).to.equal(true)

        client.session.setSession({
          accessToken: previousAccessToken,
          refreshToken: client.session.refreshToken!
        })

        client.api.autoRefreshAccessToken = false
        const { data: loggedInPrevious } = await client.isLoggedIn()
        expect(loggedInPrevious).to.equal(false)
      })
    )
  })

  describe('revoking other tokens', () => {
    test(
      'access token should no longer be valid',
      testWrapper({ connect: false }, async ({ client }) => {
        await client.revokeSession({
          revokeAccessToken: true,
          revokeRefreshToken: false
        })
        client.api.autoRefreshAccessToken = false
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(false)
      })
    )

    test(
      'refresh token should no longer be valid',
      testWrapper({ connect: false }, async ({ client }) => {
        await client.revokeSession({
          revokeAccessToken: false, // Should get revoked anyway with refresh token
          revokeRefreshToken: true
        })
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(false)
      })
    )

    test(
      'using old refresh token should revoke current refresh and access tokens',
      testWrapper({ connect: false }, async ({ client }) => {
        // Trying to use an old revoked refreshToken is suspicious so should revoke
        // the existing refresh token.
        // See https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/#Refresh-Token-Automatic-Reuse-Detection
        const previousRefreshToken = client.session.refreshToken!

        await client.session.refreshAccessToken()

        const currentRefreshToken = client.session.refreshToken!
        const currentAccessToken = client.session.accessToken!

        client.session.setSession({
          accessToken: client.session.accessToken,
          refreshToken: previousRefreshToken
        })

        // Refreshing with previous refresh token should also revoke current access and refresh tokens
        try {
          await client.session.refreshAccessToken()
        } catch {
          // Expect this to error because refresh token is revoked
        }

        // Check current tokens were revoked
        client.session.setSession({
          accessToken: currentAccessToken,
          refreshToken: currentRefreshToken
        })
        const { data: loggedIn } = await client.isLoggedIn()
        expect(loggedIn).to.equal(false)
      })
    )
  })
})
