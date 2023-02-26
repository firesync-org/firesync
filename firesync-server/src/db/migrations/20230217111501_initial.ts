import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create function that will be used for automatically updating
  // updated_at columns
  await knex.raw(/* sql */ `
    CREATE FUNCTION update_updated_at_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(/* sql */ `DROP FUNCTION update_updated_at_timestamp;`)
}
