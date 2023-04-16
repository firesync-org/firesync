import { Knex } from 'knex'
import { Y } from '../../y'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('doc_updates', (table) => {
    table.binary('svb').nullable()
  })

  const docUpdates = await knex('doc_updates').select('id', 'sv')
  for (const update of docUpdates) {
    const svb = Y.encodeStateVector(
      new Map(
        Object.entries(update.sv).map(
          ([client, clock]) => [parseInt(client), clock] as [number, number]
        )
      )
    )
    await knex('doc_updates')
      .update({
        svb
      } as any)
      .where('id', update.id)
  }

  await knex.schema.alterTable('doc_updates', (table) => {
    table.binary('svb').alter().notNullable()
  })
  await knex.schema.alterTable('doc_updates', (table) => {
    table.dropColumn('sv')
  })
  await knex.schema.alterTable('doc_updates', (table) => {
    table.renameColumn('svb', 'sv')
  })
}

export async function down(): Promise<void> {
  throw new Error('cannot rollback migration to binary sv column')
}
