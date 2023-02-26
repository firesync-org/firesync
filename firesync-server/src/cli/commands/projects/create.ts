import { Args, Command } from '@oclif/core'

import { db } from '../../../db/db'

export default class Create extends Command {
  static description = 'Create a new project'

  static args = {
    projectName: Args.string({
      name: 'name',
      required: true,
      description: 'project name'
    })
  }

  async run(): Promise<void> {
    const { args } = await this.parse(Create)

    // TODO: Validate name format and uniqueness in advance rather than ugly postgress errors

    await db.knex('projects').insert({
      name: args.projectName
    })
  }
}
