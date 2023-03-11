import logging from './logging'
import { Session } from './session'
import { ApiRequestError, AuthError, FiresyncError } from './shared/errors'

const logger = logging('api')

export class Api {
  baseUrl: string
  autoRefreshAccessToken = true

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async requestWithAccessToken<ReturnType = any>(
    path: string,
    session: Session,
    options: RequestInit = {}
  ) {
    const doRequest = async () => {
      const accessToken = session.accessToken
      if (!accessToken) {
        throw new AuthError()
      }

      return await this.request<ReturnType>(path, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`
        }
      })
    }

    try {
      return await doRequest()
    } catch (error) {
      if (
        error instanceof AuthError &&
        session.refreshToken &&
        this.autoRefreshAccessToken
      ) {
        logger.debug(
          'api request failed with AuthError, refreshing access token'
        )
        await session.refreshAccessToken()
        return await doRequest()
      } else {
        throw error
      }
    }
  }

  async request<ReturnType = any>(path: string, options: RequestInit = {}) {
    logger.debug('api request', { path, options })

    const res = await fetch(`${this.baseUrl}/${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (res.status >= 200 && res.status < 300) {
      const data: ReturnType = await res.json()
      return data
    } else {
      let json: any = {}
      try {
        // Might not have got valid JSON back with an error
        json = await res.json()
      } catch {}
      let error: FiresyncError = new ApiRequestError(
        json.message || `Unsuccessful request: ${res.status}`,
        res.status,
        typeof json.code === 'number' ? json.code : undefined
      )
      if (res.status === 401) {
        error = new AuthError()
      } else if (res.status === 403) {
        error = new AuthError(
          'You do not have permission to access that resource'
        )
      }
      throw error
    }
  }
}
