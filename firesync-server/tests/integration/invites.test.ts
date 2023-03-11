import { expect } from 'chai'
import { testWrapper, tryUntil } from './utils'
import { ApiRequestError } from '@firesync/client'

describe('Invites', () => {
  describe('Happy Path', () => {
    test(
      'Should create a token that can be redeemed by a new user to the doc',
      testWrapper({}, async ({ client: ownerClient, docKey, server, ydoc }) => {
        const { client: collaboratorClient } =
          await server.createUserAndClient()
        collaboratorClient.connection.connect()

        const { data } = await ownerClient.createInvite(docKey, {
          role: 'write',
          email: 'bob@example.com'
        })
        await collaboratorClient.redeemInvite(docKey, data!.invite.token)

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
    test.todo('Revoke previous invites sent to same email')
  })

  describe('Redeeming Invites', () => {
    test(
      'Wrong token returns invalid',
      testWrapper({}, async ({ docKey, server }) => {
        const { client: collaboratorClient } =
          await server.createUserAndClient()

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
        const { client: collaboratorClient } =
          await server.createUserAndClient()

        const { data: invite } = await ownerClient.createInvite(docKey, {
          role: 'write',
          email: 'bob@example.com'
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

    test(
      'User with a lower role gets upgraded',
      testWrapper({}, async ({ client: ownerClient, docKey, server }) => {
        const { client: collaboratorClient, userId: collaboratorId } =
          await server.createUserAndClient()

        await server.createRole(docKey, collaboratorId, 'read')

        const { data: invite2 } = await ownerClient.createInvite(docKey, {
          role: 'write',
          email: 'bob@example.com'
        })
        await collaboratorClient.redeemInvite(docKey, invite2!.invite.token)

        const { data } = await collaboratorClient.getDocRoles(docKey)
        const role = data!.doc.roles.find((r) => r.userId === collaboratorId)
        expect(role?.role).to.equal('write')
      })
    )

    test(
      'User with a higher role is unaffected',
      testWrapper({}, async ({ client: ownerClient, docKey, server }) => {
        const { client: collaboratorClient, userId: collaboratorId } =
          await server.createUserAndClient()

        await server.createRole(docKey, collaboratorId, 'write')

        const { data: invite2 } = await ownerClient.createInvite(docKey, {
          role: 'read',
          email: 'bob@example.com'
        })
        await collaboratorClient.redeemInvite(docKey, invite2!.invite.token)

        const { data } = await collaboratorClient.getDocRoles(docKey)
        const role = data!.doc.roles.find((r) => r.userId === collaboratorId)
        expect(role?.role).to.equal('write')
      })
    )
  })

  describe('Revoking access', () => {
    test.todo(`Admin should be able to revoke other user's roles`)

    test.todo(`Don't revoke final admin role`)

    test.todo(`Non admin should be able to revoke own role`)

    test.todo(`Non admin shouldn't be able to revoke other users's roles`)
  })
})
