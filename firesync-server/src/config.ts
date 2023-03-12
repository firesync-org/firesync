import { db } from './db/db'
import { UnexpectedInternalStateError } from './shared/errors'

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
  DATABASE_SSL_REJECT_UNAUTHORIZED:
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
  DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
  DATABASE_SSL_KEY: process.env.DATABASE_SSL_KEY,
  DATABASE_SSL_CERT: process.env.DATABASE_SSL_CERT,
  SESSION_SECRET: process.env.SESSION_SECRET,
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
  HOST: process.env.HOST || 'localhost',
  PORT: parseInt(process.env.PORT || '5000')
}

export const getProjectConfig = async (projectId: string) => {
  const configValues = await db
    .knex('projects')
    .select('cors_allowed_origins', 'redeem_invite_url')
    .where('id', projectId)
    .first()
  if (configValues === undefined) {
    throw new UnexpectedInternalStateError('Expected project to exist')
  }
  return {
    corsAllowedOrigins: configValues.cors_allowed_origins,
    redeemInviteUrl: configValues.redeem_invite_url
  }
}
