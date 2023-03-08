import { Knex } from 'knex'
import { timestamps } from '../helpers'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.bigIncrements('id').primary()

    // First refresh token gets a deafult family_id that all
    // derived refresh and access tokens will share
    table.bigIncrements('family_id', { primaryKey: false }).notNullable()

    // project_user_id
    table.bigInteger('project_user_id').unsigned().notNullable()
    table.foreign('project_user_id').references('project_users.id')

    table.text('token').notNullable().unique()
    table.timestamp('expires_at', { useTz: false }).notNullable()
    table.boolean('revoked').notNullable().defaultTo(false)
  })
  await timestamps(knex, 'refresh_tokens')

  await knex.schema.createTable('access_tokens', (table) => {
    table.bigIncrements('id').primary()

    table.bigInteger('family_id').notNullable()

    // project_user_id
    table.bigInteger('project_user_id').unsigned().notNullable()
    table.foreign('project_user_id').references('project_users.id')

    table.text('token').notNullable().unique()
    table.timestamp('expires_at', { useTz: false }).notNullable()
    table.boolean('revoked').notNullable().defaultTo(false)
  })
  await timestamps(knex, 'access_tokens')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('access_tokens')
  await knex.schema.dropTable('refresh_tokens')
}
