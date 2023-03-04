import { Role } from '../server/ws/auth'
import knex, { Knex } from 'knex'
import { getConfig, getKnexConfig } from './config'
import Pool from 'pg-pool'
import { Client } from 'pg'

export type DocRole = {
  id: string // bigint is returned as a string
  doc_id: string
  project_user_id: string
  role: Role
  created_at: string
  updated_at: string
}

export type Doc = {
  id: string // bigint is returned as a string
  project_id: string
  key: string
  created_at: string
  updated_at: string
}

export type Project = {
  id: string // bigint is returned as a string
  name: string
  host: string
  cors_allowed_origins?: string
  invite_success_redirect_url?: string
  invite_failure_redirect_url?: string
  created_at: string
  updated_at: string
}

export type AuthProviderGoogle = {
  client_id: string
  client_secret: string
  success_redirect_url?: string
  project_id: string
  created_at: string
  updated_at: string
}

export type ProjectUser = {
  id: string // bigint is returned as a string
  project_id: string
  created_at: string
  updated_at: string
}

export type AuthProvider = 'google'

export type ProjectUserAuthProvider = {
  id: string // bigint is returned as a string
  project_user_id: string
  auth_provider: AuthProvider
  external_user_id: string
  created_at: string
  updated_at: string
}

export type DocUpdate = {
  id: string // bigint is returned as a string
  doc_id: string
  updates: Buffer
  sv: Record<string, number>
}

export type InviteToken = {
  id: string // bigint is returned as a string
  token: string
  doc_id: string
  role: Role
  emailed_to?: string
  created_by_project_user_id: string
  expires_at: string
  redeemed_at?: string
  redeemed_as_doc_role_id?: string
  created_at: string
  updated_at: string
}

export type AccessToken = {
  id: string // bigint is returned as a string
  project_user_id: string
  token: string
  expires_at: string
  revoked: boolean
  created_at: string
  updated_at: string
}

export type RefreshToken = {
  id: string // bigint is returned as a string
  project_user_id: string
  token: string
  expires_at: string
  revoked: boolean
  created_at: string
  updated_at: string
}

declare module 'knex/types/tables' {
  interface Tables {
    docs: Doc
    doc_roles: DocRole
    projects: Project
    auth_provider_google: AuthProviderGoogle
    project_users: ProjectUser
    project_user_auth_providers: ProjectUserAuthProvider
    doc_updates: DocUpdate
    invite_tokens: InviteToken
    access_tokens: AccessToken
    refresh_tokens: RefreshToken
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
