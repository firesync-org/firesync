import { db } from '../../../db/db'
import { UnexpectedInternalStateError } from '../../../shared/errors'
import { getDocKey } from '../helpers/docs'
import { getUserId } from '../helpers/users'
import { requestHandler } from '../helpers/requestHandler'

export const docsController = {
  createDoc: requestHandler(async (req, res) => {
    const userId = getUserId(req)
    const docKey = getDocKey(req)
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
