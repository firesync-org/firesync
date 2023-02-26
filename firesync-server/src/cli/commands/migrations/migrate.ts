import { Command } from '@oclif/core'

import { db } from '../../../db/db'

export default class Migrate extends Command {
  static description = 'Run database migrations to set up correct schema'

  async run(): Promise<void> {
    await migrate()
  }
}

export const migrate = async () => {
  const initialVersion = await db.knex.migrate.currentVersion()
  console.log('Current migration version', initialVersion)

  console.log('Running migrations')
  await db.knex.migrate.latest()

  const finalVersion = await db.knex.migrate.currentVersion()
  console.log('Now on migration version', finalVersion)
}
