import { NotFoundHttpError } from '../http/helpers/errors'
import { db } from '../../db/db'
import { BadRequestError } from '../../shared/errors'

export const docs = {
  async getOrCreateDocId(projectId: string, docKey: string, txn = db.knex) {
    if (docKey.length < 3) {
      throw new BadRequestError(
        'Invalid doc key format: should be at least 3 characters long'
      )
    }
    if (docKey.length > 1024) {
      throw new BadRequestError(
        'Invalid doc key format: should be less than 1024 characters'
      )
    }
    if (!docKey.match(/^[a-zA-Z0-9][a-zA-Z0-9\-/]+[a-zA-Z0-9]$/)) {
      throw new BadRequestError(
        'Invalid doc key format: should only contain letters, numbers and / and - characters, and start and end with a letter or number'
      )
    }

    const docs = await txn('docs')
      .insert({ project_id: projectId, key: docKey })
      .onConflict(['project_id', 'key'])
      .merge() // Needed to return the id, but doesn't update anything
      .returning(['id'])

    const doc = docs[0]
    if (doc === undefined) {
      throw new NotFoundHttpError(docKey)
    }

    return doc.id
  }
}
