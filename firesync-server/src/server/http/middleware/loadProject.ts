import { logging } from '../../lib/Logging/Logger'
import { db } from '../../../db/db'
import { requestHandler } from '../helpers/requestHandler'
import { BadRequestError } from '../helpers/errors'

const logger = logging.child('loadProject')

export const loadProject = requestHandler(async (req, res, next) => {
  let hostName = req.headers.host

  if (process.env.TRUST_PROXY === 'true') {
    const forwardedHost = req.headers['x-forwarded-host']
    if (typeof forwardedHost === 'string') {
      hostName = forwardedHost
    }
  }

  if (hostName === undefined) {
    throw new BadRequestError('No host header provided')
  }
  const host = hostName.split(':')[0] // Strip port

  logger.info({ headers: req.headers, host }, 'loadProject')

  const project = await db
    .knex('projects')
    .select(
      'id',
      'name',
      'cors_allowed_origins',
      'invite_success_redirect_url',
      'invite_failure_redirect_url'
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
