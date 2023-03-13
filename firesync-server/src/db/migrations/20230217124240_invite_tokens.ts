import { Knex } from 'knex'
import { timestamps } from '../helpers'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invite_tokens', (table) => {
    table.bigIncrements('id')

    // doc_id
    table.bigInteger('doc_id').unsigned().notNullable()
    table.foreign('doc_id').references('docs.id')

    table.string('token').notNullable()

    // role
    table.string('role').notNullable()
    table.check("role IN ('admin', 'write', 'read')", [], 'valid_role')

    table.string('emailed_to')

    // created_by_project_user_id
    table.bigInteger('created_by_project_user_id').unsigned().notNullable()
    table.foreign('created_by_project_user_id').references('project_users.id')

    table.datetime('expires_at')

    table.datetime('redeemed_at')

    // redeemed_as_doc_role_id
    table.bigInteger('redeemed_as_doc_role_id').unsigned().nullable()
    table.foreign('redeemed_as_doc_role_id').references('doc_roles.id')
  })
  await timestamps(knex, 'invite_tokens')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('invite_tokens')
}
