import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (table) => {
    table.string('host').notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (table) => {
    table.dropColumn('host')
  })
}
