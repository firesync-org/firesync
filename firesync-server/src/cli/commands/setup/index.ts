import { Command } from '@oclif/core'
import { migrate } from '../migrations/migrate'
import { seed } from '../migrations/seed'

export class ConfigUpdate extends Command {
  async run() {
    await migrate()
    await seed()
  }
}
