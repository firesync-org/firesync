import { db } from '../../../db/db'
import { requestHandler } from '../helpers/requestHandler'
import { BadRequestError } from '../helpers/errors'
import { config } from '../../../config'

export const loadProject = requestHandler(async (req, res, next) => {
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
    return res.status(404).send(`Project with host ${host} does not exist`)
  }

  req.firesync = {
    project
  }

  next()
})
