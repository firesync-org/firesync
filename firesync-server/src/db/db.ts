import { Role } from '../shared/roles'
import knex, { Knex } from 'knex'
import { getKnexConfig } from './config'
import Pool from 'pg-pool'
import { Client } from 'pg'

export type DocRole = {
  id: string // bigint is returned as a string
  doc_id: string
  project_user_id: string
  role: Role
  inserted_at: Date
  updated_at: Date
}

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
  inserted_at: Date
  updated_at: Date
}

export type AccessToken = {
  id: string // bigint is returned as a string
  family_id: string
  project_user_id: string
  token: string
  expires_at: string
  revoked: boolean
  inserted_at: Date
  updated_at: Date
}

export type RefreshToken = {
  id: string // bigint is returned as a string
  family_id: string
  project_user_id: string
  token: string
  expires_at: string
  revoked: boolean
  inserted_at: Date
  updated_at: Date
}

declare module 'knex/types/tables' {
  interface Tables {
    docs: Doc
    doc_roles: DocRole
    projects: Project
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
