import { AuthInterface, Role, UserId } from './types'
import { db } from '../../db/db'

const READ_ROLES: Role[] = ['read', 'write', 'admin']
const WRITE_ROLES: Role[] = ['write', 'admin']

export const auth: AuthInterface = {
  async getUserIdFromRequest() {
    return null
  },

  async canConnect() {
    return true
  },

  async canReadDoc(userId, docId) {
    if (!userId) return false
    const role = await getRole(userId, docId)
    if (role === undefined) return false
    return READ_ROLES.includes(role)
  },

  async canWriteDoc(userId, docId) {
    if (!userId) return false
    const role = await getRole(userId, docId)
    if (role === undefined) return false
    return WRITE_ROLES.includes(role)
  }
}

const getRole = async (userId: UserId, docId: number) => {
  const role = await db
    .knex('doc_roles')
    .select('role')
    .where('doc_id', docId)
    .where('project_user_id', userId)
    .first()
  return role?.role
}
