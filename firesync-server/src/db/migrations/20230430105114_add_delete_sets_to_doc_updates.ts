import { Knex } from 'knex'
import { Y } from '../../y'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doc_updates', (table) => {
    table.renameColumn('updates', 'structs')
    table.binary('ds').notNullable().defaultTo('\\000\\000') // Empty update
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doc_updates', (table) => {
    table.renameColumn('structs', 'updates')
    table.dropColumn('ds')
  })
}
