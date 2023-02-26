import { Knex } from 'knex'
import { timestamps } from '../helpers'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_provider_google', (table) => {
    table.bigIncrements('id')
    table.string('client_id').notNullable()
    table.string('client_secret').notNullable()
    table.string('success_redirect_url')

    // project_id
    table.bigInteger('project_id').unsigned().notNullable()
    table.foreign('project_id').references('projects.id')
    table.unique(['project_id'])
  })
  await timestamps(knex, 'auth_provider_google')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('auth_provider_google')
}
