import { Knex } from 'knex'
import { timestamps } from '../helpers'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('projects', (table) => {
    table.bigIncrements('id')

    // name
    table.string('name').notNullable()
    table.unique(['name'])
    table.check("name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'", [], 'name_format')
    table.check(
      'char_length(name) >= 3 AND char_length(name) <= 63',
      [],
      'name_length'
    )
  })
  await timestamps(knex, 'projects')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('projects')
}
