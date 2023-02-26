if (
  process.env.POSTGRES_DATABASE === undefined ||
  process.env.POSTGRES_USER === undefined ||
  process.env.POSTGRES_PASSWORD === undefined
) {
  throw new Error(
    'Please set POSTGRES_DATABASE, POSTGRES_USER, POSTGRES_PASSWORD environment variables'
  )
}

export const config = {
  POSTGRES_DATABASE: process.env.POSTGRES_DATABASE,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || '5432'),
  DATABASE_SSL: process.env.DATABASE_SSL === 'true',
  DATABASE_SSL_REJECT_UNAUTHORIZED: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
  DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
  DATABASE_SSL_KEY: process.env.DATABASE_SSL_KEY,
  DATABASE_SSL_CERT: process.env.DATABASE_SSL_CERT,
  SESSION_SECRET: process.env.SESSION_SECRET,
  TRUST_PROXY: process.env.DATABASE_SSL === 'true'
}
