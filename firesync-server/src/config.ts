import { AuthProviderGoogle, db } from './db/db'
import { UnexpectedInternalStateError } from './shared/errors'

export const config = {
  postgres: {
    database: process.env.FS_POSTGRES_DATABASE || 'firesync',
    user: process.env.FS_POSTGRES_USER || 'postgres',
    password: process.env.FS_POSTGRES_PASSWORD || 'postgres',
    host: process.env.FS_POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.FS_POSTGRES_PORT || '5432'),
    ssl:
      process.env.FS_DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized: process.env.FS_DATABASE_SSL_REJECT_UNAUTHORIZED,
            ca: process.env.FS_DATABASE_SSL_CA,
            key: process.env.FS_DATABASE_SSL_KEY,
            cert: process.env.FS_DATABASE_SSL_CERT
          }
        : false
  },
  trustProxy: process.env.FS_TRUST_PROXY === 'true',
  host: process.env.FS_HOST || 'localhost',
  port: parseInt(process.env.FS_PORT || '5000')
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

export const getGoogleAuthConfig = async (projectId: string) => {
  type GoogleAuthConfig = Partial<
    Pick<
      AuthProviderGoogle,
      'client_id' | 'client_secret' | 'success_redirect_url'
    >
  >
  let googleAuthConfig: GoogleAuthConfig | undefined = await db
    .knex('auth_provider_google')
    .select('client_id', 'client_secret', 'success_redirect_url')
    .where('project_id', projectId)
    .first()
  if (googleAuthConfig === undefined) {
    googleAuthConfig = {}
  }
  return {
    clientId: googleAuthConfig.client_id,
    clientSecret: googleAuthConfig.client_secret,
    successRedirectUrl: googleAuthConfig.success_redirect_url
  }
}
