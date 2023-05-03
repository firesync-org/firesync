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
  host: process.env.FS_HOST || '0.0.0.0',
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
  const projectConfigs = await db
    .knex('project_configs')
    .select(
      'project_configs.host',
      'project_configs.fs_cors_allowed_origins',
      'jwt_secrets.secret'
    )
    .join('jwt_secrets', 'project_configs.id', 'jwt_secrets.project_config_id')
    .where('project_configs.project_id', projectId)
    .where('jwt_secrets.active', true)

  const projectConfig = projectConfigs[0]
  const jwtSecrets: string[] = projectConfigs.map((c) => c.secret)

  return {
    id: projectConfig.id,
    corsAllowedOrigins: projectConfig?.fs_cors_allowed_origins,
    jwtAuthSecrets: jwtSecrets
  }
}

const buildProjectConfigFromEnvVars = () => {
  return {
    corsAllowedOrigins: process.env.FS_CORS_ALLOWED_ORIGINS || '*',
    jwtAuthSecrets: (process.env.FS_JWT_AUTH_SECRET || '').split(','),
    id: 1
  }
}
