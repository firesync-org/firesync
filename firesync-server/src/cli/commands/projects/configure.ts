import { Command, Flags } from '@oclif/core'

import { db } from '../../../db/db'

export default class Configure extends Command {
  static description = 'Configure Google OAuth 2.0 settings'

  static flags = {
    project: Flags.string({
      summary: 'Firesync project',
      env: 'FIRESYNC_PROJECT',
      default: 'default'
    }),

    'cors-allowed-origins': Flags.string({
      summary: 'Google OAuth 2.0 Client Id',
      env: 'FIRESYNC_CORS_ALLOWED_ORIGINS'
    }),

    'invite-success-redirect-url': Flags.string({
      summary: 'URL to redirect to after an invite to a doc has been accepted',
      env: 'FIRESYNC_INVITE_SUCCESS_REDIRECT_URL'
    }),

    'invite-failure-redirect-url': Flags.string({
      summary: 'URL to redirect to after an invite to a doc has failed',
      env: 'FIRESYNC_INVITE_FAILURE_REDIRECT_URL'
    })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Configure)

    const existing = await db
      .knex('projects')
      .select(
        'id',
        'cors_allowed_origins',
        'invite_success_redirect_url',
        'invite_failure_redirect_url'
      )
      .where('name', flags.project)
      .first()

    if (existing === undefined) {
      console.error(`Project '${flags.project}' does not exist`)
      process.exit(1)
    }

    const update: {
      cors_allowed_origins?: string
      invite_success_redirect_url?: string
      invite_failure_redirect_url?: string
    } = {
      ...existing
    }

    if (flags['cors-allowed-origins']) {
      update.cors_allowed_origins = flags['cors-allowed-origins']
    }
    if (flags['invite-success-redirect-url']) {
      update.invite_success_redirect_url = flags['invite-success-redirect-url']
    }
    if (flags['invite-failure-redirect-url']) {
      update.invite_failure_redirect_url = flags['invite-failure-redirect-url']
    }

    await db.knex('projects').update(update).where('id', existing.id)
  }
}
