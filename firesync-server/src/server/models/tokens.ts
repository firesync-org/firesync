import { Request } from 'express'
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
  async generateTokens(userId: string, txn = db.knex) {
    return await txn.transaction(async (txn) => {
      const { refreshToken } = await this.generateRefreshToken(userId, txn)
      const { accessToken, expiresInSeconds } = await this.generateAccessToken(
        refreshToken,
        txn
      )
      return {
        refreshToken,
        accessToken,
        expiresInSeconds
      }
    })
  },

  async generateRefreshToken(userId: string, txn = db.knex) {
    const expiresInSeconds = REFRESH_TOKEN_EXPIRES_IN_SECONDS
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    const refreshToken = crypto
      .randomBytes(REFRESH_TOKEN_BYTES)
      .toString('base64url')

    await txn('refresh_tokens').insert({
      project_user_id: userId,
      expires_at: expiresAt.toISOString(),
      token: refreshToken
    })

    return { refreshToken, expiresInSeconds }
  },

  async generateAccessToken(refreshToken: string, txn = db.knex) {
    const expiresInSeconds = ACCESS_TOKEN_EXPIRES_IN_SECONDS
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    const refreshTokenRow = await this._getRefreshTokenRow(refreshToken, txn)

    const accessToken = crypto
      .randomBytes(ACCESS_TOKEN_BYTES)
      .toString('base64url')

    await db.knex('access_tokens').insert({
      project_user_id: refreshTokenRow.project_user_id,
      expires_at: expiresAt.toISOString(),
      token: accessToken
    })

    return { accessToken, expiresInSeconds }
  },

  async refreshAccessToken(refreshToken: string, txn = db.knex) {
    return await txn.transaction(async (txn) => {
      const refreshTokenRow = await this._getRefreshTokenRow(refreshToken, txn)

      // TODO: Invalidate all existing access tokens as well - need 'family' id first
      this.revokeRefreshToken(refreshToken, txn)

      const { refreshToken: newRefreshToken } = await this.generateRefreshToken(
        refreshTokenRow.project_user_id,
        txn
      )
      const { accessToken, expiresInSeconds } = await this.generateAccessToken(
        newRefreshToken,
        txn
      )

      return {
        refreshToken: newRefreshToken,
        accessToken,
        expiresInSeconds
      }
    })
  },

  async revokeRefreshToken(refreshToken: string, txn = db.knex) {
    // TODO: Revoke all refresh + access tokens derived from this token
    await txn('refresh_tokens')
      .update({
        revoked: true
      })
      .where('token', refreshToken)
  },

  async revokeAccessToken(accessToken: string, txn = db.knex) {
    // TODO: Revoke all refresh + access tokens derived from this token
    await txn('access_tokens')
      .update({
        revoked: true
      })
      .where('token', accessToken)
  },

  async getUserIdFromAccessToken(accessToken: string, txn = db.knex) {
    const accessTokenRow = await this._getAccessTokenRow(accessToken, txn)

    return accessTokenRow.project_user_id
  },

  async getUserIdFromRequest(req: Request) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.match(/^Bearer /)) {
      throw new UnauthorizedError(
        `No access token provided. Please set an 'Authorization: Bearer <access_token>' header`
      )
    }
    const accessToken = authHeader.replace(/^Bearer\s+/, '')
    return await this.getUserIdFromAccessToken(accessToken)
  },

  async _getRefreshTokenRow(refreshToken: string, txn = db.knex) {
    const now = new Date()

    const refreshTokenRow = await txn('refresh_tokens')
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

    return refreshTokenRow
  },

  async _getAccessTokenRow(accessToken: string, txn = db.knex) {
    const now = new Date()

    const accessTokenRow = await txn('access_tokens')
      .select('project_user_id')
      .where('token', accessToken)
      .where('revoked', false)
      .where('expires_at', '>', now.toISOString())
      .first()

    if (accessTokenRow === undefined) {
      throw new UnauthorizedError(
        'Access token does not exist, has expired or been revoked'
      )
    }
    return accessTokenRow
  }
}
