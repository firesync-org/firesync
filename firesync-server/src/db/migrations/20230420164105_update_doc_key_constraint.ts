import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('docs', (table) => {
    table.dropChecks(['key_format'])
    // key should be:
    // * Min 3 characters, max 1024 characters
    // * Only the characters a-z, A-Z, 0-9, - and /, starting or ending with a letter or number
    table.check('length(key) >= 3 AND length(key) <= 1024', [], 'key_length')
    table.check(
      "key ~ '^[a-zA-Z0-9][a-zA-Z0-9\\-/]+[a-zA-Z0-9]$'",
      [],
      'key_format'
    )
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('docs', (table) => {
    table.dropChecks(['key_length'])
  })
}
