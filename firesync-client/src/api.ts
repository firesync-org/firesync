import { Session } from './session'
import { ApiRequestError, AuthError, FiresyncError } from './shared/errors'

export class Api {
  baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async request<ReturnType = any>(
    path: string,
    session: Session,
    options: RequestInit = {}
  ) {
    const accessToken = session.accessToken
    if (!accessToken) {
      throw new AuthError('No access token')
    }

    const res = await fetch(`${this.baseUrl}/${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      ...options
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
