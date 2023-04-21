import knex, { Knex } from 'knex'
import { getKnexConfig } from './config'
import Pool from 'pg-pool'
import { Client } from 'pg'

export type Doc = {
  id: string // bigint is returned as a string
  project_id: string
  key: string
  inserted_at: Date
  updated_at: Date
}

export type Project = {
  id: string // bigint is returned as a string
  name: string
  inserted_at: Date
  updated_at: Date
}

export type ProjectUser = {
  id: string // bigint is returned as a string
  project_id: string
  inserted_at: Date
  updated_at: Date
}

export type AuthProvider = 'google'

export type ProjectUserAuthProvider = {
  id: string // bigint is returned as a string
  project_user_id: string
  auth_provider: AuthProvider
  external_user_id: string
  inserted_at: Date
  updated_at: Date
}

export type DocUpdate = {
  id: string // bigint is returned as a string
  doc_id: string
  updates: Buffer
  sv: Buffer
  size: number
  pack_level: number
  pack_last_update_inserted_at: Date
  inserted_at: Date
  updated_at: Date
}

export type ProjectConfig = {
  id: string // bigint is returned as a string
  host: string
  fs_cors_allowed_origins: string
  fs_redeem_invite_url: string
  fs_google_auth_client_id: string
  fs_google_auth_client_secret: string
  fs_google_auth_success_redirect_url: string
  project_id: string
  created_at: string
  updated_at: string
}

declare module 'knex/types/tables' {
  interface Tables {
    docs: Doc
    projects: Project
    project_users: ProjectUser
    project_user_auth_providers: ProjectUserAuthProvider
    doc_updates: DocUpdate
    project_configs: ProjectConfig
  }
}

let _knex: Knex | undefined
let _pool: Pool<Client> | undefined

// Export a factory so that we don't connect to the database
// until explicitly accessed in e.g. the CLI
export const db = {
  get knex() {
    if (_knex === undefined) {
      _knex = knex(getKnexConfig())
    }
    return _knex
  }
}
