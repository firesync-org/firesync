import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (table) => {
    table.string('redeem_invite_url')
  })
  await knex.schema.alterTable('invite_tokens', (table) => {
    table.bigInteger('redeemed_as_doc_role_id').unsigned().nullable().alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (table) => {
    table.dropColumn('redeem_invite_url')
  })
  await knex.schema.alterTable('invite_tokens', (table) => {
    table.bigInteger('redeemed_as_doc_role_id').unsigned().notNullable().alter()
  })
}
