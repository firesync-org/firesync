import { Command } from '@oclif/core'

import { db } from '../../../db/db'

export default class Rollback extends Command {
  static description = 'Rollback the latest migration'

  async run(): Promise<void> {
    const initialVersion = await db.knex.migrate.currentVersion()
    console.log('Current migration version', initialVersion)

    console.log('Rolling back')
    await db.knex.migrate.rollback()

    const finalVersion = await db.knex.migrate.currentVersion()
    console.log('Now on migration version', finalVersion)
  }
}
