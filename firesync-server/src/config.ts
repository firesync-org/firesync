import { db } from './db/db'

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
          rejectUnauthorized:
            process.env.FS_DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
          ca: process.env.FS_DATABASE_SSL_CA,
          key: process.env.FS_DATABASE_SSL_KEY,
          cert: process.env.FS_DATABASE_SSL_CERT
        }
        : false
  },
  trustProxy: process.env.FS_TRUST_PROXY === 'true',
  host: process.env.FS_HOST || 'localhost',
  port: parseInt(process.env.FS_PORT || '5000'),

  // Internal only, but can be updated for testing via debugRouter
  packAfterNUpdates: 64,
  waitSecondsBeforePacking: 60
}

export const getProjectConfig = async (projectId: string) => {
  if (process.env.FS_MULTI_PROJECT === 'true') {
    return await buildProjectConfigFromDb(projectId)
  } else {
    return buildProjectConfigFromEnvVars()
  }
}

const buildProjectConfigFromDb = async (projectId: string) => {
  const projectConfig = await db
    .knex('project_configs')
    .select('host', 'fs_redeem_invite_url', 'fs_cors_allowed_origins')
    .where('project_id', projectId)
    .first()

  return {
    host: projectConfig?.host,
    corsAllowedOrigins: projectConfig?.fs_cors_allowed_origins || '*',
    redeemInviteUrl:
      projectConfig?.fs_redeem_invite_url || '/setup/redeem_invite_url',
    googleAuth: { clientId: '1', clientSecret: '2', successRedirectUrl: '3' } // remove in seperate pr
  }
}

const buildProjectConfigFromEnvVars = () => {
  return {
    corsAllowedOrigins: process.env.FS_CORS_ALLOWED_ORIGINS || '*',
    redeemInviteUrl:
      process.env.FS_REDEEM_INVITE_URL || '/setup/redeem_invite_url',
    googleAuth: { clientId: '1', clientSecret: '2', successRedirectUrl: '3' } // remove in seperate pr
  }
}
