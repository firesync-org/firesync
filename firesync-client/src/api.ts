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
        return { data: null, error: new AuthError() }
      }

      return await this.request<ReturnType>(path, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`
        }
      })
    }

    const { data, error } = await doRequest()
    if (
      error &&
      error instanceof AuthError &&
      session.refreshToken &&
      this.autoRefreshAccessToken
    ) {
      logger.debug('api request failed with AuthError, refreshing access token')
      await session.refreshAccessToken()
      const result = await doRequest()
      return result
    } else {
      return { data, error }
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

    let error: FiresyncError | null = null
    let data: ReturnType | null = null
    if (res.status >= 200 && res.status < 300) {
      data = await res.json()
    } else {
      let json: any = {}
      try {
        // Might not have got valid JSON back with an error
        json = await res.json()
      } catch {}
      error = new ApiRequestError(
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
    }

    return { data, error }
  }
}
