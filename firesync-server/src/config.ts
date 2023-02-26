const POSTGRES_DATABASE = process.env.POSTGRES_DATABASE
const POSTGRES_USER = process.env.POSTGRES_USER
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost'
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432')

if (
  POSTGRES_DATABASE === undefined ||
  POSTGRES_USER === undefined ||
  POSTGRES_PASSWORD === undefined
) {
  throw new Error(
    'Please set POSTGRES_DATABASE, POSTGRES_USER, POSTGRES_PASSWORD environment variables'
  )
}

const DATABASE_SSL = process.env.DATABASE_SSL === 'true'
const DATABASE_SSL_REJECT_UNAUTHORIZED =
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
const DATABASE_SSL_CA = process.env.DATABASE_SSL_CA
const DATABASE_SSL_KEY = process.env.DATABASE_SSL_KEY
const DATABASE_SSL_CERT = process.env.DATABASE_SSL_CERT

/**
 * This is a jsdoc comment for config
 * @property {string} POSTGRES_DATABASE
 */
export const config = {
  POSTGRES_DATABASE,
  POSTGRES_HOST,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_PORT,
  DATABASE_SSL,
  DATABASE_SSL_REJECT_UNAUTHORIZED,
  DATABASE_SSL_CA,
  DATABASE_SSL_KEY,
  DATABASE_SSL_CERT
}
