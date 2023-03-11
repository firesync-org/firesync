import { expect } from 'chai'
import { getClient, testWrapper, tryUntil } from './utils'
import { DebugClient } from './utils/debugClient'

const newUser = async (server: DebugClient) => {
  const client = getClient({
    connect: false // Wait until we have a user and session
  })

  const { accessToken, refreshToken } = await server.createUser()
  client.session.setSession({ accessToken, refreshToken })

  return client
}

describe('Invites', () => {
  describe('Happy Path', () => {
    test(
      'Should create a token that can be redeemed by a new user to the doc',
      testWrapper({}, async ({ client: ownerClient, docKey, server, ydoc }) => {
        const collaboratorClient = await newUser(server)
        collaboratorClient.connection.connect()

        const {
          invite: { token }
        } = await ownerClient.createInvite(docKey, {
          role: 'write',
          email: 'bob@example.com '
        })

        await collaboratorClient.redeemInvite(docKey, token)

        // Owner update
        ydoc.getText('t').insert(0, 'foo')

        const ydocB = collaboratorClient.connection.subscribe(docKey)
        await tryUntil(async () => {
          expect(ydocB.getText('t').toJSON()).to.equal('foo')
        })

        collaboratorClient.connection.disconnect()
      })
    )
  })

  describe('Sending Invites', () => {
    test.todo(
      'What should it do when sending an invite to an email with an existing invite?'
    )
  })

  describe('Redeeming Invites', () => {
    test.todo('Valid token grants access to the doc')

    test.todo('Expired token returns invalid')

    test.todo('Missing token returns invalid')

    test.todo('User with a lower role gets upgraded')

    test.todo('User with a higher role is unaffected')
  })

  describe('Revoking access', () => {
    test.todo('User should no longer have access')

    test.todo('Do not remove last admin role')
  })
})
