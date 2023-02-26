import { Command } from '@oclif/core'

import { db } from '../../../db/db'

export default class List extends Command {
  static description = 'List projects'

  async run(): Promise<void> {
    const projects = await db.knex('projects').select('name')

    for (const project of projects) {
      console.log(project.name)
    }
  }
}
