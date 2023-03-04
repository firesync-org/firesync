import { string } from 'lib0'
import { Api } from './api'
import logging from './logging'
import { AuthError } from './shared/errors'

const logger = logging('session')

type StoredSession = {
  accessToken: string
  refreshToken: string
}

type StorageInterface = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const SESSION_KEY = 'firesync-session'

// For testing, or where localStorage isn't available
export class SessionMemoryStorage implements StorageInterface {
  data = new Map<string, string>()

  getItem(key: string) {
    return this.data.get(key) || null
  }

  setItem(key: string, value: string) {
    this.data.set(key, value)
  }

  removeItem(key: string) {
    this.data.delete(key)
  }
}

const defaultStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? window.localStorage
    : new SessionMemoryStorage()

export class Session {
  api: Api
  storage: StorageInterface

  constructor(api: Api, storage = defaultStorage) {
    this.api = api
    this.storage = storage
    this.loadSessionFromUrl()
  }

  get accessToken() {
    const session = this.storage.getItem(SESSION_KEY)
    if (session) {
      const { accessToken } = JSON.parse(session) as Partial<StoredSession>
      return accessToken
    }
  }

  get refreshToken() {
    const session = this.storage.getItem(SESSION_KEY)
    if (session) {
      const { refreshToken } = JSON.parse(session) as Partial<StoredSession>
      return refreshToken
    }
  }

  async refreshAccessToken() {
    const refreshToken = this.refreshToken
    if (!refreshToken) {
      throw new AuthError('Cannot refresh access token without refresh token')
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

      this.saveSession({
        accessToken: result.access_token,
        refreshToken: result.refresh_token
      })
    } catch (error) {
      // If we failed to refresh, then our tokens have expired
      if (error instanceof AuthError) {
        this.clearSession()
      }
      throw error
    }

    logger.debug('refreshed access token')
  }

  private loadSessionFromUrl() {
    if (typeof window === 'undefined') {
      return
    }

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
        this.saveSession({ accessToken, refreshToken })
        window.location.hash = ''
      }
    }
  }

  saveSession(session: StoredSession) {
    this.storage.setItem(SESSION_KEY, JSON.stringify(session))
  }

  clearSession() {
    this.storage.removeItem(SESSION_KEY)
  }
}
