import { requestHandler } from '../helpers/requestHandler'
import { tokens } from '../../models/tokens'
import { BadRequestError } from '../helpers/errors'

export const tokenController = {
  refreshAccessToken: requestHandler(async (req, res) => {
    const refreshToken = req.body.refresh_token
    if (typeof refreshToken !== 'string') {
      throw new BadRequestError('Expected refresh_token')
    }

    const { accessToken, expiresInSeconds } = await tokens.generateAccessToken(
      refreshToken
    )

    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresInSeconds,
      token_type: 'bearer'
    })
  }),

  revokeTokens: requestHandler(async (req, res) => {
    const refreshToken = req.body.refresh_token
    if (typeof refreshToken === 'string') {
      await tokens.revokeRefreshToken(refreshToken)
    }

    const accessToken = req.body.access_token
    if (typeof accessToken === 'string') {
      await tokens.revokeAccessToken(accessToken)
    }

    res.json({})
  })
}
