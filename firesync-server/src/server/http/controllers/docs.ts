import { db } from '../../../db/db'
import { UnexpectedInternalStateError } from '../../../shared/errors'
import { getDocKeyFromRequest } from '../helpers/docs'
import { requestHandler } from '../helpers/requestHandler'
import { tokens } from '../../models/tokens'

export const docsController = {
  createDoc: requestHandler(async (req, res) => {
    const userId = await tokens.getUserIdFromRequest(req)
    const docKey = getDocKeyFromRequest(req)
    const project = req.firesync.project

    await db.knex.transaction(async (txn) => {
      const [doc] = await txn('docs').insert(
        {
          project_id: project.id,
          key: docKey
        },
        ['id']
      )
      if (doc === undefined) {
        throw new UnexpectedInternalStateError(
          'Expected doc to have been created'
        )
      }

      await txn('doc_roles').insert({
        doc_id: doc.id,
        project_user_id: userId.toString(),
        role: 'admin'
      })
    })

    res.status(201).json({ doc: { key: docKey } })
  })
}
