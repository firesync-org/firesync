import { db } from '../../db/db'
import { BadRequestError, NotFoundError } from '../http/helpers/errors'
import { config } from '../../config'
import { IncomingMessage } from 'http'

export const projects = {
  async getProjectFromRequest(req: IncomingMessage) {
    let hostName = req.headers.host

    if (config.TRUST_PROXY) {
      const forwardedHost = req.headers['x-forwarded-host']
      if (typeof forwardedHost === 'string') {
        hostName = forwardedHost
      }
    }

    if (hostName === undefined) {
      throw new BadRequestError('No host header provided')
    }
    const host = hostName.split(':')[0] // Strip port

    const project = await db
      .knex('projects')
      .select(
        'id',
        'name',
        'cors_allowed_origins',
        'invite_success_redirect_url',
        'invite_failure_redirect_url',
        'host'
      )
      .where('host', host)
      .first()

    if (project === undefined) {
      throw new NotFoundError(`Project with host ${host} does not exist`)
    }

    return project
  }
}