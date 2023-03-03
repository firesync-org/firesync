import { Api } from './api'
import { Connection } from './connection'
import { Session } from './session'
import { AuthError } from './shared/errors'

// Export the Yjs version we're using because it's important that all code
// uses the same version, because constructor checks are used to test for
// equality. yjs will warn about this if you use multiple version and things
// will randomly fail.
export { Y } from './y'
export { Connection } from './connection'
export { LogLevel, setLogLevel } from './logging'
export { MessageType } from './shared/protocol'
export { AuthError } from './shared/errors'

type Options = {
  baseUrl: string
}

export default class Firesync {
  baseUrl: string
  connection: Connection
  session: Session
  api: Api

  constructor({ baseUrl }: Options) {
    // TODO: Do some sanity checking about the baseUrl
    // includes protocol, matches protocol of client, etc
    this.baseUrl = baseUrl
    this.api = new Api(baseUrl)
    this.session = new Session(this.api)
    this.connection = new Connection(this.baseUrl, {})
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
    return await this.api.request<{ userId?: number }>('user', this.session)
  }

  async getUserRoles() {
    return await this.api.request<{
      user: { roles: Array<{ docKey: string; userId: number; role: string }> }
    }>('api/user/roles', this.session)
  }

  async createDoc(docKey: string) {
    return await this.api.request('api/docs', this.session, {
      method: 'POST',
      body: JSON.stringify({ docKey })
    })
  }

  async createInvite(docKey: string, role: string) {
    return await this.api.request('api/docs/invites', this.session, {
      method: 'POST',
      body: JSON.stringify({ docKey, role })
    })
  }

  async redeemInvite(docKey: string, token: string) {
    return await this.api.request(
      `api/docs/invites/${token}/redeem`,
      this.session,
      {
        method: 'POST',
        body: JSON.stringify({ docKey })
      }
    )
  }
}
