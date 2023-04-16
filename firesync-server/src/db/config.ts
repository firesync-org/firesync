import path from 'path'
import { config } from '../config'

export const getKnexConfig = () => {
  const { postgres } = config

  const migrationsDir = path.join(__dirname, 'migrations')

  return {
    client: 'postgres',
    connection: postgres,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      // The migrations are run via firesync-server migrations migrate
      // which uses the compiled js files in src/dist
      loadExtensions: ['.js'],
      tableName: 'knex_migrations',
      directory: migrationsDir,
      schemaName: 'public'
    }
  }
}
