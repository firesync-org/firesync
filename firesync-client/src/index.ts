import { Connection } from './connection'
import logging from './logging'
import { FiresyncError } from './shared/errors'
import { ApiRequestError, AuthError } from './shared/errors'

// Export the Yjs version we're using because it's important that all code
// uses the same version, because constructor checks are used to test for
// equality. yjs will warn about this if you use multiple version and things
// will randomly fail.
export { Y } from './y'
export { Connection } from './connection'
export { LogLevel, setLogLevel } from './logging'
export { MessageType } from './shared/protocol'
export { AuthError } from './shared/errors'

const logger = logging('firesync')

type Options = {
  baseUrl: string
}

type Session = {
  accessToken: string
  refreshToken: string
}

export default class Firesync {
  baseUrl: string
  connection: Connection
  session?: Session

  constructor({ baseUrl }: Options) {
    // TODO: Do some sanity checking about the baseUrl
    // includes protocol, matches protocol of client, etc
    this.baseUrl = baseUrl
    this.connection = new Connection(this.baseUrl, {})

    this.session = this.loadSession()
  }

  async isLoggedIn() {
    try {
      await this.getUser()
    } catch (error) {
      if (error instanceof AuthError) {
        return false
      } else {
        throw error
      }
    }
    return true
  }

  async getUser() {
    return await this.apiRequest<{ userId?: number }>('user')
  }

  async getUserRoles() {
    return await this.apiRequest<{
      user: { roles: Array<{ docKey: string; userId: number; role: string }> }
    }>('api/user/roles')
  }

  async createDoc(docKey: string) {
    return await this.apiRequest('api/docs', {
      method: 'POST',
      body: JSON.stringify({ docKey })
    })
  }

  async createInvite(docKey: string, role: string) {
    return await this.apiRequest('api/docs/invites', {
      method: 'POST',
      body: JSON.stringify({ docKey, role })
    })
  }

  async redeemInvite(docKey: string, token: string) {
    return await this.apiRequest(`api/docs/invites/${token}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ docKey })
    })
  }

  private async apiRequest<ReturnType = any>(
    path: string,
    options: RequestInit = {}
  ) {
    const accessToken = this.session?.accessToken
    if (!accessToken) {
      throw new AuthError('No access token')
    }
    const res = await fetch(`${this.baseUrl}/${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      ...options
    })
    if (res.status >= 200 && res.status < 300) {
      const data: ReturnType = await res.json()
      return data
    } else {
      let error: FiresyncError = new ApiRequestError(`Unsuccessful request: ${res.status}`, res.status)
      if (res.status === 403) {
        error = new AuthError('Not authorized')
      }
      throw error
    }
  }

  private loadSession() {
    const params = new URLSearchParams(
      window.location.hash.substring(1) // skip the first char (#)
    )
    logger.debug('params', params)

    // Load session from URL if present
    if (params.get('token_type') === 'bearer') {
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        const session = { accessToken, refreshToken }
        logger.debug('loading session from url', session)
        localStorage.setItem('session', JSON.stringify(session))
        window.location.hash = ''
        return session
      }
    }

    // Load session from local storage if present
    const session = localStorage.getItem('session')
    if (session) {
      const { accessToken, refreshToken } = JSON.parse(session) as Partial<Session>
      logger.debug('loading session from local storage', { accessToken, refreshToken })
      if (accessToken && refreshToken) {
        return { accessToken, refreshToken }
      }
    }

    logger.debug('no session found')
    
    return
  }
}
