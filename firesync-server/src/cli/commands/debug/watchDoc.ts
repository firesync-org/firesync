import { Args, Command, Flags } from '@oclif/core'
import createSubscriber from 'pg-listen'

import models from '../../../server/models'
import { config } from '../../../config'
import { db } from '../../../db/db'
import { svToString, updateToString } from '../../../shared/yUtils'
import { docChannelName } from '../../../server/lib/Docs/DocStore'
import { Y } from '../../../y'

export default class WatchDoc extends Command {
  static description = 'Watch the update structure of a document'

  static args = {
    docKey: Args.string({
      required: true
    })
  }

  static flags = {
    projectName: Flags.string({
      default: 'default'
    })
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(WatchDoc)

    const project = await models.projects.getProjectFromName(flags.projectName)
    const docId = await models.docs.getOrCreateDocId(project.id, args.docKey)

    const subscriber = createSubscriber(config.postgres)
    await subscriber.connect()

    const displayUpdates = async () => {
      const updates = await db
        .knex('doc_updates')
        .where('doc_id', docId)
        .orderBy('pack_last_update_inserted_at')

      console.clear()
      for (const updateRow of updates) {
        const {
          id,
          structs,
          sv,
          ds,
          pack_last_update_inserted_at: packLastUpdateInsertedAt,
          pack_level: packLevel,
          size
        } = updateRow

        console.log(`--- PACK ${id}`)
        console.log(
          `[${packLevel}] [${packLastUpdateInsertedAt.toISOString()}] {${svToString(
            sv
          )}} ${size}\n${updateToString(Y.mergeUpdates([structs, ds]), '\n')}}`
        )
      }
    }

    subscriber.notifications.on(docChannelName(docId), displayUpdates)

    await subscriber.listenTo(docChannelName(docId))

    await displayUpdates()

    await new Promise(() => {
      // Hold open process so that knex clean up code doesn't run
    })
  }
}
