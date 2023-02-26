import { Command } from '@oclif/core'

import { db } from '../../../db/db'

export default class Rollback extends Command {
  static description = 'Rollback the latest migration'

  async run(): Promise<void> {
    await db.knex.migrate.rollback()
  }
}
