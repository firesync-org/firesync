import querystring from 'node:querystring'

import { db } from '../../db/db'
import {
  BadRequestError,
  UnexpectedInternalStateError
} from '../../shared/errors'
import { Role } from '../../shared/roles'
import { tokens } from '../models/tokens'
import { IncomingMessage } from 'http'

const READ_ROLES: Role[] = ['read', 'write', 'admin']
const WRITE_ROLES: Role[] = ['write', 'admin']

export const auth = {
  async getUserIdFromRequest(request: IncomingMessage) {
    if (request.url === undefined) {
      throw new UnexpectedInternalStateError(
        'Expected request.url to be defined'
      )
    }

    const query = request.url.split('?')[1] || ''
    const accessToken = querystring.decode(query).access_token

    if (typeof accessToken !== 'string') {
      throw new BadRequestError('Expected access_token in URL parameters')
    }

    const userId = await tokens.getUserIdFromAccessToken(accessToken)

    return userId
  },

  async canReadDoc(userId: string, docId: number) {
    if (!userId) return false
    const role = await getRole(userId, docId)
    if (role === undefined) return false
    return READ_ROLES.includes(role)
  },

  async canWriteDoc(userId: string, docId: number) {
    if (!userId) return false
    const role = await getRole(userId, docId)
    if (role === undefined) return false
    return WRITE_ROLES.includes(role)
  }
}

const getRole = async (userId: string, docId: number) => {
  const role = await db
    .knex('doc_roles')
    .select('role')
    .where('doc_id', docId)
    .where('project_user_id', userId)
    .first()
  return role?.role
}
