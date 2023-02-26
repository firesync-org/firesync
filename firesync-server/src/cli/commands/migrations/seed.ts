import { Command } from '@oclif/core'

import { db } from '../../../db/db'

export default class Migrate extends Command {
  static description = 'Seed database with default project'

  async run(): Promise<void> {
    await seed()
  }
}

export const seed = async () => {
  console.log('Creating default project')
  await db
    .knex('projects')
    .insert({
      name: 'default',
      host: 'localhost'
    })
    .onConflict()
    .ignore()
}
