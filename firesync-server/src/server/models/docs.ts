import { CannotAccessDocHttpError } from '../http/helpers/errors'
import { db } from '../../db/db'
import { Role } from '../../shared/roles'
import { roles } from './roles'

export const docs = {
  async getDocId(
    projectId: string,
    docKey: string,
    userId: string,
    allowedRoles: Role[]
  ) {
    const docId = await this.getDocIdWithoutAuth(projectId, docKey)
    const currentRole = await roles.getRole(docId, userId)
    if (currentRole === undefined || !allowedRoles.includes(currentRole.role)) {
      throw new CannotAccessDocHttpError(docKey)
    }

    return docId
  },

  async getDocIdWithoutAuth(projectId: string, docKey: string, txn = db.knex) {
    const doc = await txn('docs')
      .select('id')
      .where('project_id', projectId)
      .andWhere('key', docKey)
      .first()
    if (doc === undefined) {
      throw new CannotAccessDocHttpError(docKey)
    }

    return doc.id
  }
}
