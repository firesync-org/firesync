import crypto from 'crypto'
import querystring from 'node:querystring'

import { db } from '../../../db/db'
import { getDocId, getDocIdWithoutAuth, getDocKey } from '../helpers/docs'
import { requestHandler } from '../helpers/requestHandler'
import { BadRequestHttpError, NotFoundHttpError } from '../helpers/errors'
import { isRole, roles } from '../../../shared/roles'
import {
  FiresyncErrorCode,
  UnexpectedInternalStateError
} from '../../../shared/errors'
import { tokens } from '../../models/tokens'
import { logging } from '../../lib/Logging/Logger'

const logger = logging.child('invites')

export const invitesController = {
  createInvite: requestHandler(async (req, res) => {
    const project = req.firesync.project
    const userId = await tokens.getUserIdFromRequest(req)
    const docKey = getDocKey(req)

    const role = req.body.role
    if (typeof role !== 'string' || !isRole(role)) {
      throw new BadRequestHttpError(
        `Expected role to be one of: ${roles.join(', ')}`
      )
    }

    const email = req.body.email
    if (typeof email !== 'string') {
      throw new BadRequestHttpError(`Expected email to be a string`)
    }

    if (!project.redeem_invite_url) {
      throw new BadRequestHttpError(
        'Project has no redeem_invite_url configured'
      )
    }

    const docId = await getDocId(project, docKey, userId, ['admin'])

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

    // TODO: Don't allow creating multiple tokens for the same email, just re-send the existing one

    // TODO: Include expiry date in here for quick client side checking of validity
    const url = `${project.redeem_invite_url}#${querystring.stringify({
      token,
      doc_key: docKey,
      firesync_flow: 'redeem_invite'
    })}`
    console.log('pretending to send email', url)
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
    const docKey = getDocKey(req)
    const userId = await tokens.getUserIdFromRequest(req)
    const { token } = req.params
    if (typeof token !== 'string') {
      throw new UnexpectedInternalStateError(`Expected token from params`)
    }

    const project = req.firesync.project
    const docId = await getDocIdWithoutAuth(project, docKey)

    // TODO: If the user already has a role for the doc, increase it if the invite is better
    // or just flow through to invite_success_redirect_url if not

    const invite = await db
      .knex('invite_tokens')
      .where('doc_id', docId)
      .where('token', token)
      .where('expires_at', '>', new Date().toISOString())
      .where('redeemed_at', 'IS', null)
      .first()
    if (invite === undefined) {
      throw new NotFoundHttpError(
        `Token does not exist, has expired or has already been redeemed: ${token}`,
        FiresyncErrorCode.INVALID_INVITE_TOKEN_ERROR
      )
    }

    await db.knex.transaction(async (txn) => {
      const [docRole] = await txn('doc_roles')
        .insert({
          doc_id: invite.doc_id,
          project_user_id: userId,
          role: invite.role
        })
        .returning(['id'])

      if (docRole === undefined) {
        throw new UnexpectedInternalStateError(
          'Expected doc_role to have been created'
        )
      }

      await txn('invite_tokens')
        .update({
          redeemed_at: new Date().toISOString(),
          redeemed_as_doc_role_id: docRole.id
        })
        .where('id', invite.id)
    })

    res.status(201).json({})
  })
}
