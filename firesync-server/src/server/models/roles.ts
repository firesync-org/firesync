import { UnexpectedInternalStateError } from '../../shared/errors'
import { db } from '../../db/db'
import { Role } from '../../shared/roles'

export const roles = {
  async getRole(docId: string, userId: string, txn = db.knex) {
    return await txn('doc_roles')
      .where('doc_id', docId)
      .andWhere('project_user_id', userId)
      .first()
  },

  async setRole(docId: string, userId: string, role: Role, txn = db.knex) {
    const [docRole] = await txn('doc_roles')
      .insert({
        doc_id: docId,
        project_user_id: userId,
        role
      })
      .onConflict(['doc_id', 'project_user_id'])
      .merge(['role'])
      .returning(['id'])

    if (docRole === undefined) {
      throw new UnexpectedInternalStateError(
        'Expected doc_role to have been created'
      )
    }
    return docRole
  }
}
