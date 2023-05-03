import jwt from 'jsonwebtoken'
import querystring from 'node:querystring'
import { db } from '../../db/db'

import { UnexpectedInternalStateError } from '../../shared/errors'
import { IncomingMessage } from 'http'
import { getProjectConfig } from '../../config'
import models from '../../server/models'

import {
  BadRequestHttpError,
  UnauthorizedHttpError
} from '../http/helpers/errors'
import { docKeyPatternToRegex } from '../lib/wildCardsToRegex'

export type Role = 'read' | 'write'

const isRole = (role: string): role is Role => {
  return ['read', 'write'].includes(role)
}

export type Session = {
  docs: Record<string, Role>
}

export const auth = {
  async getSessionFromRequest(request: IncomingMessage): Promise<Session> {
    if (request.url === undefined) {
      throw new UnexpectedInternalStateError(
        'Expected request.url to be defined'
      )
    }

    const project = await models.projects.getProjectFromRequest(request)

    const query = request.url.split('?')[1] || ''
    const accessToken = querystring.decode(query).access_token

    if (typeof accessToken !== 'string') {
      throw new BadRequestHttpError('Expected access_token in URL parameters')
    }

    return this.getSessionFromAccessToken(accessToken, project.id)
  },

  async getSessionFromAccessToken(
    accessToken: string,
    projectId: string
  ): Promise<Session> {
    let payload
    const projectConfig = await getProjectConfig(projectId)

    for (const secret of projectConfig.jwtAuthSecrets) {
      try {
        payload = jwt.verify(accessToken, secret)
      } catch (error) {
        continue
      }
      if (payload) {
        secretUpdatedAtBump(projectConfig.id, secret) // fire and forget
        break
      }
    }
    if (!payload) {
      throw new UnauthorizedHttpError('Invalid JWT: Invalid secret')
    }
    if (typeof payload !== 'object') {
      throw new UnauthorizedHttpError('Invalid JWT: Bad payload')
    }
    const docs: Record<string, Role> = {}
    for (const [docKey, role] of Object.entries(payload.docs || {})) {
      if (typeof role === 'string' && isRole(role)) {
        docs[docKey] = role
      }
    }
    return { docs }
  },

  async canReadDoc(session: Session, docKey: string) {
    const role = findRole(session, docKey)
    return role && ['read', 'write'].includes(role)
  },

  async canWriteDoc(session: Session, docKey: string) {
    const role = findRole(session, docKey)
    return role && role === 'write'
  }
}

const secretUpdatedAtBump = (projectConfigId: string, secret: string) => {
  if (process.env.FS_MULTI_PROJECT === 'true') {
    db.knex('jwt_secrets')
      .update({
        last_used_at: db.knex.raw('NOW()')
      })
      .where({
        project_config_id: projectConfigId,
        secret
      })
  }
}

const findRole = (session: Session, docKey: string) => {
  for (const [docKeyPattern, role] of Object.entries(session.docs)) {
    const regex = docKeyPatternToRegex(docKeyPattern)
    if (docKey.match(regex)) {
      return role
    }
  }
  return null
}
