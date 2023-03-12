import crypto from 'crypto'
import querystring from 'node:querystring'

import { db } from '../../../db/db'
import { getDocKeyFromRequest } from '../helpers/docs'
import { requestHandler } from '../helpers/requestHandler'
import { BadRequestHttpError, NotFoundHttpError } from '../helpers/errors'
import { isRole, rolePrecendence, roles } from '../../../shared/roles'
import {
  FiresyncErrorCode,
  UnexpectedInternalStateError
} from '../../../shared/errors'
import { logging } from '../../lib/Logging/Logger'
import models from '../../../server/models'
import { getProjectConfig } from '../../../config'

const logger = logging.child('invites')

export const invitesController = {
  createInvite: requestHandler(async (req, res) => {
    const project = await models.projects.getProjectFromRequest(req)
    const userId = await models.tokens.getUserIdFromRequest(req)
    const docKey = getDocKeyFromRequest(req)

    const role = req.body.role
    if (typeof role !== 'string' || !isRole(role)) {
      throw new BadRequestHttpError(
        `Expected role to be one of: ${new Array(roles).join(', ')}`
      )
    }

    const email = req.body.email
    if (typeof email !== 'string') {
      throw new BadRequestHttpError(`Expected email to be a string`)
    }

    const { redeemInviteUrl } = await getProjectConfig(project.id)

    const docId = await models.docs.getDocId(project.id, docKey, userId, [
      'admin'
    ])

    // Expire in 7 days time
    const now = new Date()
    const expiresAt = new Date()
    expiresAt.setDate(now.getDate() + 7)

    const randomBytes = await new Promise<Buffer>((resolve, reject) =>
      crypto.randomBytes(32, (error, buf) =>
        error ? reject(error) : resolve(buf)
      )
    )
    const token = randomBytes.toString('base64url')

    // TODO: Revoke old invite tokens for the same email address

    // TODO: Include expiry date in here for quick client side checking of validity
    const url = `${redeemInviteUrl}#${querystring.stringify({
      token,
      doc_key: docKey,
      firesync_flow: 'redeem_invite'
    })}`
    logger.debug({ role, email, url: url.replace(token, '***') }, 'sent invite')

    await db.knex('invite_tokens').insert({
      doc_id: docId,
      token,
      role,
      created_by_project_user_id: userId,
      expires_at: expiresAt.toISOString(),
      emailed_to: email
    })

    return res.status(201).json({
      invite: {
        token,
        role,
        expiresAt: expiresAt.toISOString()
      }
    })
  }),

  redeemInvite: requestHandler(async (req, res) => {
    const docKey = getDocKeyFromRequest(req)
    const userId = await models.tokens.getUserIdFromRequest(req)
    const { token } = req.params
    if (typeof token !== 'string') {
      throw new UnexpectedInternalStateError(`Expected token from params`)
    }

    const project = await models.projects.getProjectFromRequest(req)
    const docId = await models.docs.getDocIdWithoutAuth(project.id, docKey)

    // TODO: If the user already has a role for the doc, increase it if the invite is better
    // or just flow through to invite_success_redirect_url if not

    const invite = await models.invites.getInvite(docId, token)
    if (invite === undefined) {
      throw new NotFoundHttpError(
        `Token does not exist, has expired or has already been redeemed: ${token}`,
        FiresyncErrorCode.INVALID_INVITE_TOKEN_ERROR
      )
    }

    await db.knex.transaction(async (txn) => {
      let redeemedAsRoleId: string
      const currentRole = await models.roles.getRole(docId, userId)
      if (
        !currentRole ||
        // Only upgrade the user, don't downgrade through invites
        rolePrecendence[currentRole.role] <= rolePrecendence[invite.role]
      ) {
        const newRole = await models.roles.setRole(
          docId,
          userId,
          invite.role,
          txn
        )
        redeemedAsRoleId = newRole.id
      } else {
        redeemedAsRoleId = currentRole.id
      }
      await models.invites.markAsRedeemed(invite.id, redeemedAsRoleId, txn)
    })

    res.status(201).json({})
  })
}
