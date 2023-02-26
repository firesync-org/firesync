import fetch, { RequestInit } from 'node-fetch'

export class ServerClient {
  url: string
  cookie?: string

  constructor(url: string) {
    this.url = url
  }

  async createUser() {
    const response = await this.fetch(`/debug/user`, {
      method: 'POST'
    })
    this.cookie = response.headers.raw()['set-cookie']![0]
  }

  async getUser() {
    const response = await this.fetch(`/user`)
    return await response.json()
  }

  async createDoc(docKey: string) {
    const response = await this.fetch(`/api/docs`, {
      method: 'POST',
      body: JSON.stringify({ docKey })
    })
    return await response.json()
  }

  async getDocUpdates(docKey: string) {
    const response = await this.fetch(`/debug/docs/${docKey}/updates`)
    const data = (await response.json()) as {
      updates: Array<number[]>
    }
    return data.updates.map((update) => Uint8Array.from(update))
  }

  async getDocStateVector(docKey: string) {
    const response = await this.fetch(`/debug/docs/${docKey}/sv`)
    const data = (await response.json()) as {
      sv: { [clientId: string]: number }
    }
    return data.sv
  }

  async getConnectionCounts() {
    const response = await this.fetch(`/debug/connections`)
    const data = (await response.json()) as {
      connections: { [docKey: string]: number }
    }
    return data.connections
  }

  async terminateDocConnections(docKey: string) {
    await this.fetch(`/debug/docs/${docKey}/connections/terminate`, {
      method: 'POST'
    })
  }

  async refuseConnections() {
    await this.fetch(`/debug/connections/refuse`, {
      method: 'POST'
    })
  }

  async acceptConnections() {
    await this.fetch(`/debug/connections/accept`, {
      method: 'POST'
    })
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.url}${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(this.cookie
          ? {
              cookie: this.cookie
            }
          : {})
      },
      ...options
    })
    if (response.status >= 300) {
      throw new Error(
        `Error from serverClient request (${
          response.status
        }):\n${await response.text()}`
      )
    }
    return response
  }
}
