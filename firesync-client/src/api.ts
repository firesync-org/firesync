import logging from './logging'
import { Session } from './session'
import { ApiRequestError, AuthError, FiresyncError } from './shared/errors'

const logger = logging('api')

export class Api {
  baseUrl: string

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
        throw new AuthError('No access token')
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
      if (error instanceof AuthError && session.refreshToken) {
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
      let error: FiresyncError = new ApiRequestError(
        `Unsuccessful request: ${res.status}`,
        res.status
      )
      if (res.status === 401 || res.status === 403) {
        error = new AuthError('Not authorized')
      }
      throw error
    }
  }
}
