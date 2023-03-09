import { Request } from 'express'
import { db } from '../../db/db'
import crypto from 'node:crypto'
import { UnauthorizedError } from '../http/helpers/errors'
import { UnexpectedInternalStateError } from '../../shared/errors'
import { Knex } from 'knex'
import { logging } from '../lib/Logging/Logger'

const logger = logging.child('tokens')

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
      const { refreshToken, familyId } = await this.generateRefreshToken(
        userId,
        undefined,
        txn
      )
      const { accessToken, expiresInSeconds } = await this.generateAccessToken(
        refreshToken,
        familyId,
        txn
      )
      return {
        refreshToken,
        accessToken,
        expiresInSeconds
      }
    })
  },

  async generateRefreshToken(
    userId: string,
    familyId: string | undefined,
    txn = db.knex
  ) {
    const expiresInSeconds = REFRESH_TOKEN_EXPIRES_IN_SECONDS
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    const refreshToken = crypto
      .randomBytes(REFRESH_TOKEN_BYTES)
      .toString('base64url')

    const [row] = await txn('refresh_tokens')
      .insert({
        project_user_id: userId,
        family_id: familyId,
        expires_at: expiresAt.toISOString(),
        token: refreshToken
      })
      .returning(['family_id'])

    if (row === undefined) {
      throw new UnexpectedInternalStateError(
        'expected refresh_token to have been created'
      )
    }

    return { refreshToken, expiresInSeconds, familyId: row.family_id }
  },

  async generateAccessToken(
    refreshToken: string,
    familyId: string,
    txn = db.knex
  ) {
    const expiresInSeconds = ACCESS_TOKEN_EXPIRES_IN_SECONDS
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    const refreshTokenRow = await this._getRefreshTokenRow(
      refreshToken,
      {},
      txn
    )

    const accessToken = crypto
      .randomBytes(ACCESS_TOKEN_BYTES)
      .toString('base64url')

    await db.knex('access_tokens').insert({
      project_user_id: refreshTokenRow.project_user_id,
      family_id: familyId,
      expires_at: expiresAt.toISOString(),
      token: accessToken
    })

    return { accessToken, expiresInSeconds }
  },

  async refreshAccessToken(refreshToken: string, txn = db.knex) {
    const result = await txn.transaction(async (txn) => {
      // If we're trying to refreshing using a revoked token, we should also
      // revoke ALL tokens.
      // See https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/#Refresh-Token-Automatic-Reuse-Detection
      const refreshTokenRow = await this._getRefreshTokenRow(
        refreshToken,
        { allowRevokedDANGER: true },
        txn
      )

      logger.debug(
        {
          familyId: refreshTokenRow.family_id,
          alreadyRevoked: refreshTokenRow.revoked
        },
        'refreshing access token'
      )

      // Revoke old tokens
      await this._revokeRefreshTokensByFamilyId(refreshTokenRow.family_id, txn)
      await this._revokeAccessTokensByFamilyId(refreshTokenRow.family_id, txn)

      // Only issue new tokens if not revoked
      if (refreshTokenRow.revoked) {
        return this._RefreshTokenUnauthorizedError() // Throwing will rollback transaction
      }

      const { refreshToken: newRefreshToken } = await this.generateRefreshToken(
        refreshTokenRow.project_user_id,
        refreshTokenRow.family_id,
        txn
      )
      const { accessToken, expiresInSeconds } = await this.generateAccessToken(
        newRefreshToken,
        refreshTokenRow.family_id,
        txn
      )

      return {
        refreshToken: newRefreshToken,
        accessToken,
        expiresInSeconds
      }
    })

    if (result instanceof Error) {
      throw result
    } else {
      return result
    }
  },

  async revokeRefreshToken(refreshToken: string, txn = db.knex) {
    await txn.transaction(async (txn) => {
      const refreshTokenRow = await this._getRefreshTokenRowIfExists(
        refreshToken,
        {},
        txn
      )
      if (!refreshTokenRow) {
        // Token is revoked, expired or missing, so nothing to do
        return
      }
      logger.debug(
        { familyId: refreshTokenRow.family_id },
        'revoking refresh token'
      )
      await this._revokeRefreshTokensByFamilyId(refreshTokenRow.family_id, txn)
      await this._revokeAccessTokensByFamilyId(refreshTokenRow.family_id, txn)
    })
  },

  async revokeAccessToken(accessToken: string, txn = db.knex) {
    await txn.transaction(async (txn) => {
      const accessTokenRow = await this._getAccessTokenRowIfExists(
        accessToken,
        txn
      )
      if (!accessTokenRow) {
        // Token is revoked, expired or missing, so nothing to do
        return
      }
      logger.debug(
        { familyId: accessTokenRow.family_id },
        'revoking access token'
      )
      await this._revokeRefreshTokensByFamilyId(accessTokenRow.family_id, txn)
      await this._revokeAccessTokensByFamilyId(accessTokenRow.family_id, txn)
    })
  },

  async _revokeRefreshTokensByFamilyId(familyId: string, txn: Knex) {
    await txn('refresh_tokens')
      .update({
        revoked: true
      })
      .where('family_id', familyId)
  },

  async _revokeAccessTokensByFamilyId(familyId: string, txn: Knex) {
    await txn('access_tokens')
      .update({
        revoked: true
      })
      .where('family_id', familyId)
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

  async _getRefreshTokenRowIfExists(
    refreshToken: string,
    { allowRevokedDANGER = false } = {},
    txn: Knex
  ) {
    const now = new Date()

    let tokensQuery = txn('refresh_tokens')
      .select('project_user_id', 'family_id', 'revoked')
      .where('token', refreshToken)
      .where('expires_at', '>', now.toISOString())

    if (!allowRevokedDANGER) {
      tokensQuery = tokensQuery.where('revoked', false)
    }

    const refreshTokenRow = await tokensQuery.first()

    return refreshTokenRow
  },

  async _getRefreshTokenRow(
    refreshToken: string,
    { allowRevokedDANGER = false } = {},
    txn: Knex
  ) {
    const refreshTokenRow = await this._getRefreshTokenRowIfExists(
      refreshToken,
      { allowRevokedDANGER },
      txn
    )

    if (refreshTokenRow === undefined) {
      throw this._RefreshTokenUnauthorizedError()
    }

    return refreshTokenRow
  },

  async _getAccessTokenRowIfExists(accessToken: string, txn: Knex) {
    const now = new Date()

    const accessTokenRow = await txn('access_tokens')
      .select('project_user_id', 'family_id')
      .where('token', accessToken)
      .where('revoked', false)
      .where('expires_at', '>', now.toISOString())
      .first()

    return accessTokenRow
  },

  async _getAccessTokenRow(accessToken: string, txn: Knex) {
    const accessTokenRow = await this._getAccessTokenRowIfExists(
      accessToken,
      txn
    )

    if (accessTokenRow === undefined) {
      throw new UnauthorizedError(
        'Access token does not exist, has expired or been revoked'
      )
    }
    return accessTokenRow
  },

  _RefreshTokenUnauthorizedError() {
    // For consistency regardless of where thrown
    return new UnauthorizedError(
      'Refresh token does not exist, has expired or been revoked'
    )
  }
}
