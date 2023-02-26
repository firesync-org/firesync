import { Knex } from 'knex'
import { timestamps } from '../helpers'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('doc_updates', (table) => {
    table.bigIncrements('id')

    // doc_id
    table.bigInteger('doc_id').unsigned().notNullable()
    table.foreign('doc_id').references('docs.id')

    table.binary('updates').notNullable()
    table.jsonb('sv').notNullable()
  })
  await timestamps(knex, 'doc_updates')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('doc_updates')
}
