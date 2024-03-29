import { db } from '../../db/db'
import { IncomingMessage } from 'http'
import { UnexpectedInternalStateError } from '../../shared/errors'
import { getHostName } from '../http/helpers/host'
import { NotFoundHttpError } from '../http/helpers/errors'

export const projects = {
  // this needs to default to first project if not multi project
  async getProjectFromRequest(req: IncomingMessage) {
    let project
    if (process.env.FS_MULTI_PROJECT === 'true') {
      const hostname = getHostName(req)

      const projectConfig = await db
        .knex('project_configs')
        .select('project_id')
        .where('host', hostname)
        .first()

      if (projectConfig === undefined) {
        throw new NotFoundHttpError(
          `Project with host ${hostname} does not exist`
        )
      }
      project = { id: projectConfig.project_id }
    } else {
      project = await db.knex('projects').select('id').first()

      if (project === undefined) {
        throw new UnexpectedInternalStateError(`Project does not exist`)
      }
    }

    return project
  },

  async getProjectFromName(name: string) {
    const project = await db
      .knex('projects')
      .select('id')
      .where('name', name)
      .first()

    if (project === undefined) {
      throw new UnexpectedInternalStateError(`Project does not exist`)
    }

    return project
  }
}
