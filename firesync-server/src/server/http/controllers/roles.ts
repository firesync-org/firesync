import { requestHandler } from '../helpers/requestHandler'
import { db } from '../../../db/db'
import models from '../../models'
import { tokens } from '../../models/tokens'
import { getDocKeyFromRequest } from '../helpers/docs'

export const rolesController = {
  listDocRoles: requestHandler(async (req, res) => {
    const docKey = getDocKeyFromRequest(req)
    const userId = await tokens.getUserIdFromRequest(req)

    const docId = await models.docs.getDocId(
      req.firesync.project,
      docKey,
      userId,
      ['admin', 'read', 'write']
    )

    const docRoles = await db
      .knex('doc_roles')
      .select([
        db.knex.ref('key').withSchema('docs').as('docKey'),
        db.knex.ref('project_user_id').withSchema('doc_roles').as('userId'),
        db.knex.ref('role').withSchema('doc_roles')
      ])
      .join('docs', 'doc_roles.doc_id', 'docs.id')
      .where('doc_roles.doc_id', docId)

    res.json({ doc: { roles: docRoles } })
  }),

  listUserRoles: requestHandler(async (req, res) => {
    const userId = await tokens.getUserIdFromRequest(req)

    const userRoles = await db
      .knex('doc_roles')
      .select([
        db.knex.ref('key').withSchema('docs').as('docKey'),
        db.knex.ref('project_user_id').withSchema('doc_roles').as('userId'),
        db.knex.ref('role').withSchema('doc_roles')
      ])
      .join('docs', 'doc_roles.doc_id', 'docs.id')
      .where('project_user_id', userId)

    res.json({ user: { roles: userRoles } })
  })
}
