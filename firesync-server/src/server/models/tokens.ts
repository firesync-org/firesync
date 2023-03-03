import { db } from '../../db/db'
import crypto from 'node:crypto'
import { UnauthorizedError } from '../http/helpers/errors'

const SECONDS = 1
const MINUTES = 60 * SECONDS
const HOURS = 60 * MINUTES
const DAYS = 24 * HOURS

const REFRESH_TOKEN_BYTES = 128
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 30 * DAYS

const ACCESS_TOKEN_BYTES = 128
const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * MINUTES

export const tokens = {
  async generateRefreshToken(userId: string) {
    const expiresInSeconds = REFRESH_TOKEN_EXPIRES_IN_SECONDS
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    const refreshToken = crypto
      .randomBytes(REFRESH_TOKEN_BYTES)
      .toString('base64url')

    await db.knex('refresh_tokens').insert({
      project_user_id: userId,
      expires_at: expiresAt.toISOString(),
      token: refreshToken
    })

    return { refreshToken, expiresInSeconds }
  },

  async generateAccessToken(refreshToken: string) {
    const expiresInSeconds = ACCESS_TOKEN_EXPIRES_IN_SECONDS
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    const now = new Date()

    const refreshTokenRow = await db
      .knex('refresh_tokens')
      .select('project_user_id')
      .where('token', refreshToken)
      .where('revoked', false)
      .where('expires_at', '>', now.toISOString())
      .first()

    if (refreshTokenRow === undefined) {
      throw new UnauthorizedError(
        'Refresh token does not exist, has expired or been revoked'
      )
    }

    const accessToken = crypto
      .randomBytes(ACCESS_TOKEN_BYTES)
      .toString('base64url')

    await db.knex('access_tokens').insert({
      project_user_id: refreshTokenRow.project_user_id,
      expires_at: expiresAt.toISOString(),
      token: accessToken
    })

    return { accessToken, expiresInSeconds }
  }
}
