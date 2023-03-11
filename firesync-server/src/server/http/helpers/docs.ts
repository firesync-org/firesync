import { Request } from 'express'
import { BadRequestHttpError, CannotAccessDocHttpError } from './errors'
import { Project, db } from '../../../db/db'
import { Role } from '../../../shared/roles'

export const getDocKey = (req: Request) => {
  const docKey = req.body.docKey || req.query.docKey
  if (typeof docKey !== 'string') {
    throw new BadRequestHttpError(`Expected docKey to be provided as a string`)
  }
  return docKey
}

export const getDocId = async (
  project: Pick<Project, 'id'>,
  docKey: string,
  userId: string,
  allowedRoles: Role[]
) => {
  const docId = await getDocIdWithoutAuth(project, docKey)

  const currentRole = await db
    .knex('doc_roles')
    .where('doc_id', docId)
    .andWhere('project_user_id', userId)
    .first()
  if (currentRole === undefined || !allowedRoles.includes(currentRole.role)) {
    throw new CannotAccessDocHttpError(docKey)
  }

  return docId
}

export const getDocIdWithoutAuth = async (
  project: Pick<Project, 'id'>,
  docKey: string
) => {
  const doc = await db.knex
    .select('id')
    .from('docs')
    .where('project_id', project.id)
    .andWhere('key', docKey)
    .first()
  if (doc === undefined) {
    throw new CannotAccessDocHttpError(docKey)
  }

  return doc.id
}
