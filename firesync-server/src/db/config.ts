import path from 'path'
import { config } from '../config'

export const getConfig = () => {
  let ssl:
    | {
        rejectUnauthorized?: boolean
        ca?: string
        key?: string
        cert?: string
      }
    | boolean = false

  if (config.DATABASE_SSL) {
    ssl = {
      rejectUnauthorized: config.DATABASE_SSL_REJECT_UNAUTHORIZED,
      ca: config.DATABASE_SSL_CA,
      key: config.DATABASE_SSL_KEY,
      cert: config.DATABASE_SSL_CERT
    }
  }

  const {
    POSTGRES_DATABASE,
    POSTGRES_HOST,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_PORT
  } = config

  return {
    POSTGRES_DATABASE,
    POSTGRES_HOST,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_PORT,
    ssl
  }
}

export const getKnexConfig = () => {
  const {
    POSTGRES_DATABASE,
    POSTGRES_HOST,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_PORT,
    ssl
  } = getConfig()

  const migrationsDir = path.join(__dirname, 'migrations')

  return {
    client: 'postgres',
    connection: {
      database: POSTGRES_DATABASE,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      host: POSTGRES_HOST,
      port: POSTGRES_PORT,
      ssl
    },
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
