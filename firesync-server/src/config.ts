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

export const getProjectConfig = async (_projectId: string) => {
  // TODO: Leave as async function with projectId argument so these
  // can be loaded from the database if needed
  return {
    corsAllowedOrigins: process.env.FS_CORS_ALLOWED_ORIGINS || '*',
    redeemInviteUrl:
      process.env.FS_REDEEM_INVITE_URL || '/setup/redeem_invite_url',
    googleAuth: {
      clientId: process.env.FS_GOOGLE_AUTH_CLIENT_ID,
      clientSecret: process.env.FS_GOOGLE_AUTH_CLIENT_SECRET,
      successRedirectUrl:
        process.env.FS_GOOGLE_AUTH_SUCCESS_REDIRECT_URL ||
        '/setup/google_auth_success_redirect_url'
    }
  }
}
