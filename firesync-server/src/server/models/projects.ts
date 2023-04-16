import { db } from '../../db/db'
import { IncomingMessage } from 'http'
import { UnexpectedInternalStateError } from '../../shared/errors'

export const projects = {
  async getProjectFromRequest(_req: IncomingMessage) {
    const project = await db.knex('projects').select('id').first()

    if (project === undefined) {
      throw new UnexpectedInternalStateError(`Project does not exist`)
    }

    return project

    // const hostName = getHostName(req)
    // const host = hostName.split(':')[0] // Strip port

    // const project = await db
    //   .knex('projects')
    //   .select('id')
    //   .where('host', host)
    //   .first()

    // if (project === undefined) {
    //   throw new NotFoundHttpError(`Project with host ${host} does not exist`)
    // }

    // return project
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
