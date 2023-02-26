import { number, string } from 'lib0'
import { Connection } from './connection'

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
  project: string
  host?: string
}

export default class Firesync {
  project: string
  host: string
  connection: Connection

  constructor({ project, host = 'api.firesync.live' }: Options) {
    this.project = project
    this.host = `${this.project}.${host}`
    this.connection = new Connection(this.host, {})
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
    const res = await fetch(`https://${this.host}/${path}`, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      ...options
    })
    if (res.status >= 200 && res.status < 300) {
      const data: ReturnType = await res.json()
      return data
    } else {
      throw new Error(`Unsuccessful request: ${res.status}`)
    }
  }
}
