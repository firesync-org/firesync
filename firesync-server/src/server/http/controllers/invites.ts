import crypto from 'crypto'
import { db } from '../../../db/db'
import { getDocId, getDocIdWithoutAuth, getDocKey } from '../helpers/docs'
import { requestHandler } from '../helpers/requestHandler'
import { BadRequestError, NotFoundError } from '../helpers/errors'
import { isRole, roles } from '../../ws/auth'
import { UnexpectedInternalStateError } from '../../../shared/errors'
import { template } from '../helpers/template'
import { tokens } from '../../models/tokens'

export const invitesController = {
  createInvite: requestHandler(async (req, res) => {
    const userId = await tokens.getUserIdFromRequest(req)
    const docKey = getDocKey(req)

    const role = req.body.role
    if (typeof role !== 'string' || !isRole(role)) {
      throw new BadRequestError(
        `Expected role to be one of: ${roles.join(', ')}`
      )
    }

    const docId = await getDocId(req.firesync.project, docKey, userId, [
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

    // TODO: Don't allow creating multiple tokens for the same email, just re-send the existing one

    await db.knex('invite_tokens').insert({
      doc_id: docId,
      token,
      role,
      created_by_project_user_id: userId,
      expires_at: expiresAt.toISOString()
    })

    return res.status(201).json({
      invite: {
        token,
        docId,
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

    // TODO: If invite has already been redeemed for this user, just treat it as a success
    // so they can re-use links from invite emails, etc
    // TODO: If the invite has expired and has an email to send it to, allow a new invite to
    // be sent to the same email
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
      throw new NotFoundError(
        `Token does not exist, has expired or has already been redeemed: ${token}`
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

    console.log({ project })

    if (
      project.invite_success_redirect_url &&
      project.invite_success_redirect_url !== ''
    ) {
      res.redirect(
        template(project.invite_success_redirect_url, {
          DOC_KEY_URI_ENCODED: encodeURIComponent(docKey),
          DOC_KEY: docKey,
          DOC_ID: docId,
          ROLE: invite.role
        })
      )
    } else {
      res.status(201).send()
    }
  }),

  // Render a form that makes a post request to redeemInvite
  // so that the user can redeem the invite through following a link
  // which makes a GET request
  redeemInviteCsrfForm: requestHandler(async (req, res) => {
    const docKey = getDocKey(req)
    const { token } = req.params
    if (typeof token !== 'string') {
      throw new UnexpectedInternalStateError(`Expected token from params`)
    }

    return res.render('redeemInvite', { docKey, token })
  })
}
