import { Knex } from 'knex'

export const timestamps = async (knex: Knex, tableName: string) => {
  await knex.schema.alterTable(tableName, (table) => {
    // set useTz to match Phoenix/Ecto expectations
    table.timestamp('inserted_at', { useTz: false }).notNullable()
    table.timestamp('updated_at', { useTz: false }).notNullable()
  })

  await knex.raw(
    /* sql */ `ALTER TABLE ${tableName} ALTER COLUMN updated_at SET DEFAULT NOW()`
  )

  await knex.raw(
    /* sql */ `ALTER TABLE ${tableName} ALTER COLUMN inserted_at SET DEFAULT NOW()`
  )

  await knex.raw(/* sql */ `
    CREATE TRIGGER update_updated_at_timestamp
    BEFORE UPDATE ON ${tableName}
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_timestamp();
  `)
}
