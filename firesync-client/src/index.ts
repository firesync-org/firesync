import { Api } from './api'
import { Connection } from './connection'
import { Session } from './session'
import { AuthError } from './shared/errors'
import { Role } from './shared/roles'

// Export the Yjs version we're using because it's important that all code
// uses the same version, because constructor checks are used to test for
// equality. yjs will warn about this if you use multiple version and things
// will randomly fail.
export { Y } from './y'
export { Connection } from './connection'
export { LogLevel, setLogLevel } from './logging'
export { MessageType } from './shared/protocol'
export { AuthError } from './shared/errors'
export { Role, roles } from './shared/roles'
export { Session } from './session'
export { Api } from './api'

type Options = {
  baseUrl: string
  connect?: boolean
  WebSocket?: any
  session?: Session
}

export default class Firesync {
  baseUrl: string
  connection: Connection
  session: Session
  api: Api

  constructor({ baseUrl, connect = true, WebSocket, session }: Options) {
    // TODO: Do some sanity checking about the baseUrl
    // includes protocol, matches protocol of client, etc
    this.baseUrl = baseUrl
    this.api = new Api(baseUrl)
    if (session !== undefined) {
      this.session = session
    } else {
      this.session = new Session(this.api)
    }
    this.connection = new Connection(this.baseUrl, this.session, {
      connect,
      CustomWebSocket: WebSocket
    })
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

  async logOut() {
    await this.revokeSession()
    this.session.clearSession()
  }

  async revokeSession({
    revokeAccessToken = true,
    revokeRefreshToken = true
  } = {}) {
    await this.api.request('auth/tokens/revoke', {
      method: 'POST',
      body: JSON.stringify({
        access_token: revokeAccessToken ? this.session.accessToken : undefined,
        refresh_token: revokeRefreshToken
          ? this.session.refreshToken
          : undefined
      })
    })
  }

  async logIn({ provider }: { provider: string }) {
    window.location.href = `${this.baseUrl}/auth/${provider}`
  }

  async getUser() {
    return await this.api.requestWithAccessToken<{ userId: string }>(
      'user',
      this.session
    )
  }

  async getUserRoles() {
    return await this.api.requestWithAccessToken<{
      user: { roles: Array<{ docKey: string; userId: number; role: Role }> }
    }>('api/user/roles', this.session)
  }

  async createDoc(docKey: string) {
    return await this.api.requestWithAccessToken('api/docs', this.session, {
      method: 'POST',
      body: JSON.stringify({ docKey })
    })
  }

  async createInvite(
    docKey: string,
    { role = 'read', email }: { role?: Role; email?: string } = {}
  ) {
    return await this.api.requestWithAccessToken(
      'api/docs/invites',
      this.session,
      {
        method: 'POST',
        body: JSON.stringify({ docKey, role, email })
      }
    )
  }

  async redeemInvite(docKey: string, token: string) {
    return await this.api.requestWithAccessToken(
      `api/docs/invites/${token}/redeem`,
      this.session,
      {
        method: 'POST',
        body: JSON.stringify({ docKey })
      }
    )
  }
}
