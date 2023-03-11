import { expect } from 'chai'
import { testWrapper, tryUntil } from './utils'
import { ApiRequestError } from '@firesync/client'

describe('Invites', () => {
  describe('Happy Path', () => {
    test(
      'Should create a token that can be redeemed by a new user to the doc',
      testWrapper({}, async ({ client: ownerClient, docKey, server, ydoc }) => {
        const collaboratorClient = await server.createUserAndClient()
        collaboratorClient.connection.connect()

        const { data } = await ownerClient.createInvite(docKey, {
          role: 'write',
          email: 'bob@example.com '
        })
        const {
          invite: { token }
        } = data!

        await collaboratorClient.redeemInvite(docKey, token)

        // Owner update
        ydoc.getText('t').insert(0, 'foo')

        const ydocB = collaboratorClient.connection.subscribe(docKey)
        await tryUntil(async () => {
          expect(ydocB.getText('t').toJSON()).to.equal('foo')
        })
      })
    )
  })

  describe('Sending Invites', () => {
    test.todo(
      'What should it do when sending an invite to an email with an existing invite?'
    )
  })

  describe('Redeeming Invites', () => {
    test(
      'Wrong token returns invalid',
      testWrapper({}, async ({ docKey, server }) => {
        const collaboratorClient = await server.createUserAndClient()

        const { data, error, invalid } = await collaboratorClient.redeemInvite(
          docKey,
          'made-up-token'
        )

        expect(invalid).to.equal(true)
        expect(data).to.equal(null)
        expect(error).to.be.instanceOf(ApiRequestError)
      })
    )

    test(
      'Expired token returns invalid',
      testWrapper({}, async ({ client: ownerClient, docKey, server }) => {
        const collaboratorClient = await server.createUserAndClient()

        const { data: invite } = await ownerClient.createInvite(docKey, {
          role: 'write',
          email: 'bob@example.com '
        })
        const {
          invite: { token }
        } = invite!

        await server.expireInviteToken(token)

        const { data, error, invalid } = await collaboratorClient.redeemInvite(
          docKey,
          token
        )

        expect(invalid).to.equal(true)
        expect(data).to.equal(null)
        expect(error).to.be.instanceOf(ApiRequestError)
      })
    )

    test.todo('User with a lower role gets upgraded')

    test.todo('User with a higher role is unaffected')
  })

  describe('Revoking access', () => {
    test.todo('User should no longer have access')

    test.todo('Do not remove last admin role')
  })
})
