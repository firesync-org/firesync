import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTable('session')
}

export async function down(knex: Knex): Promise<void> {
  // Set up sessions table
  // From https://github.com/voxpelli/node-connect-pg-simple/blob/0e5c628e0feca59f6ecd51c8256089caa9905410/table.sql#L1-L10
  await knex.raw(/* sql */ `
    CREATE TABLE "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);
    
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    
    CREATE INDEX "IDX_session_expire" ON "session" ("expire");
  `)
}
