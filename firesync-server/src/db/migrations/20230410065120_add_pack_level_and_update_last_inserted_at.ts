import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doc_updates', (table) => {
    table.integer('pack_level').unsigned().defaultTo(0).notNullable()
    table.timestamp('pack_last_update_inserted_at', { useTz: false }).nullable()
  })

  await knex.raw(
    /* sql */ `UPDATE doc_updates SET pack_last_update_inserted_at = inserted_at`
  )

  await knex.schema.alterTable('doc_updates', (table) => {
    table
      .timestamp('pack_last_update_inserted_at', { useTz: false })
      .alter()
      .notNullable()
  })

  await knex.raw(
    /* sql */ `ALTER TABLE doc_updates ALTER COLUMN pack_last_update_inserted_at SET DEFAULT NOW()`
  )
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doc_updates', (table) => {
    table.dropColumn('pack_level')
    table.dropColumn('pack_last_update_inserted_at')
  })
}
