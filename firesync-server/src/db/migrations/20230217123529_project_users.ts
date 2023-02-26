import { Knex } from 'knex'
import { timestamps } from '../helpers'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_users', (table) => {
    table.bigIncrements('id')

    // project_id
    table.bigInteger('project_id').unsigned().notNullable()
    table.foreign('project_id').references('projects.id')

    // user_auth_providers references the actual auth info
  })
  await timestamps(knex, 'project_users')

  await knex.schema.createTable('project_user_auth_providers', (table) => {
    table.bigIncrements('id')

    // project_user_id
    table.bigInteger('project_user_id').unsigned().notNullable()
    table.foreign('project_user_id').references('project_users.id')

    // auth_provider - valid and unique
    table.string('auth_provider').notNullable()
    table.check("auth_provider IN ('google')", [], 'valid_auth_provider')
    table.unique(['project_user_id', 'auth_provider'])

    table.string('external_user_id').notNullable()
  })
  await timestamps(knex, 'project_user_auth_providers')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('project_user_auth_providers')
  await knex.schema.dropTable('project_users')
}
