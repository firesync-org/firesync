import { Api } from './api'
import logging from './logging'
import { AuthError } from './shared/errors'

const logger = logging('session')

const LOCAL_STORAGE_KEY = 'firesync-session'

export class Session {
  accessToken?: string
  refreshToken?: string
  api: Api

  constructor(api: Api) {
    this.api = api
    this.loadSession()
  }

  async refreshAccessToken() {
    const refreshToken = this.refreshToken
    if (!refreshToken) {
      throw new AuthError('Cannot refresh access toke0n without refresh token')
    }

    logger.debug('refreshing access token')

    try {
      const result = await this.api.request<{
        access_token: string
        refresh_token: string
      }>('auth/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      this.saveSession(result.access_token, result.refresh_token)
    } catch (error) {
      // If we failed to refresh, then our tokens have expired
      if (error instanceof AuthError) {
        this.clearSession()
      }
      throw error
    }

    logger.debug('refreshed access token')
  }

  private loadSession() {
    const params = new URLSearchParams(
      window.location.hash.substring(1) // skip the first char (#)
    )

    // Load session from URL if present
    if (params.get('token_type') === 'bearer') {
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        logger.debug('loading session from url', {
          accessToken,
          refreshToken
        })
        this.saveSession(accessToken, refreshToken)
        window.location.hash = ''
        return
      }
    }

    // Load session from local storage if present
    const session = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (session) {
      const { accessToken, refreshToken } = JSON.parse(
        session
      ) as Partial<Session>
      if (accessToken && refreshToken) {
        logger.debug('loading session from local storage', {
          accessToken,
          refreshToken
        })
        this.saveSession(accessToken, refreshToken)
        return
      }
    }

    logger.debug('no valid session found')
  }

  private saveSession(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken
      })
    )
  }

  private clearSession() {
    this.refreshToken = undefined
    this.accessToken = undefined
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  }
}
