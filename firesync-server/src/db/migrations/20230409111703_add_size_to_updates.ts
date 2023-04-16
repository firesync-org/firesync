import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(
    /* sql */ `ALTER TABLE doc_updates ADD column size INTEGER GENERATED ALWAYS AS (length(updates)) STORED`
  )
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doc_updates', (table) => {
    table.dropColumn('size')
  })
}
