import { Knex } from 'knex'
import { timestamps } from '../helpers'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('docs', (table) => {
    table.bigIncrements('id')

    // project_id
    table.bigInteger('project_id').unsigned().notNullable()
    table.foreign('project_id').references('projects.id')

    // key
    table.string('key').notNullable()
    // key should be:
    // * Not blank
    // * Only the characters a-z, A-Z, 0-9, - and /
    table.check("key ~ '^[a-zA-Z0-9\\-/]+$'", [], 'key_format')

    table.unique(['project_id', 'key'])
  })
  await timestamps(knex, 'docs')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('docs')
}
