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

    'client-id': Flags.string({
      summary: 'Google OAuth 2.0 Client Id',
      env: 'FIRESYNC_GOOGLE_CLIENT_ID'
    }),

    'client-secret': Flags.string({
      summary: 'Google OAuth 2.0 Client Secret',
      env: 'FIRESYNC_GOOGLE_CLIENT_SECRET'
    }),

    'success-redirect-url': Flags.string({
      summary: 'URL to redirect to after successful login',
      env: 'FIRESYNC_GOOGLE_SUCCESS_REDIRECT_URL'
    })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Configure)

    const project = await db
      .knex('projects')
      .select('id')
      .where('name', flags.project)
      .first()

    if (project === undefined) {
      console.error(`Project '${flags.project}' does not exist`)
      process.exit(1)
    }

    const existing = await db
      .knex('auth_provider_google')
      .select('client_id', 'client_secret', 'success_redirect_url')
      .where('project_id', project.id)
      .first()

    const insert: {
      project_id: string
      client_id?: string
      client_secret?: string
      success_redirect_url?: string
    } = {
      ...existing,
      project_id: project.id
    }

    if (flags['client-id']) {
      insert.client_id = flags['client-id']
    }
    if (flags['client-secret']) {
      insert.client_secret = flags['client-secret']
    }
    if (flags['success-redirect-url']) {
      insert.success_redirect_url = flags['success-redirect-url']
    }

    // Do an upsert
    await db
      .knex('auth_provider_google')
      .insert(insert)
      .onConflict('project_id')
      .merge()
  }
}
