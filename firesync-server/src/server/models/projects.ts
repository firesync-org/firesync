import { db } from '../../db/db'
import { NotFoundHttpError } from '../http/helpers/errors'
import { IncomingMessage } from 'http'
import { getHostName } from '../http/helpers/host'

export const projects = {
  async getProjectFromRequest(req: IncomingMessage) {
    const hostName = getHostName(req)
    const host = hostName.split(':')[0] // Strip port

    const project = await db
      .knex('projects')
      .select('id')
      .where('host', host)
      .first()

    if (project === undefined) {
      throw new NotFoundHttpError(`Project with host ${host} does not exist`)
    }

    return project
  }
}
