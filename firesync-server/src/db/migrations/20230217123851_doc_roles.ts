import { Knex } from 'knex'
import { timestamps } from '../helpers'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('doc_roles', (table) => {
    table.bigIncrements('id')

    // doc_id
    table.bigInteger('doc_id').unsigned().notNullable()
    table.foreign('doc_id').references('docs.id')

    // project_user_id
    table.bigInteger('project_user_id').unsigned().notNullable()
    table.foreign('project_user_id').references('project_users.id')

    // key
    table.string('role').notNullable()
    table.check("role IN ('admin', 'write', 'read')", [], 'valid_role')

    table.unique(['project_user_id', 'doc_id'])
  })
  await timestamps(knex, 'doc_roles')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('doc_roles')
}
