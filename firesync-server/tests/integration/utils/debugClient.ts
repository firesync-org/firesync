import fetch, { RequestInit } from 'node-fetch'
import Firesync from '@firesync/client'
import { getClient } from './getClient'

export class DebugClient {
  url: string
  clients: Firesync[]

  constructor(url: string) {
    this.url = url
    this.clients = []
  }

  async createUser() {
    const response = await this.fetch(`/debug/user`, {
      method: 'POST'
    })
    const { refreshToken, accessToken } = (await response.json()) as {
      refreshToken: string
      accessToken: string
      expiresInSeconds: number
    }
    return { refreshToken, accessToken }
  }

  async createUserAndClient() {
    const { accessToken, refreshToken } = await this.createUser()

    const client = getClient({
      connect: false
    })
    client.session.setSession({ accessToken, refreshToken })

    this.clients.push(client)

    return client
  }

  async expireTokens({
    refreshToken,
    accessToken
  }: {
    refreshToken?: string
    accessToken?: string
  }) {
    await this.fetch('/debug/tokens/expire', {
      method: 'POST',
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken
      })
    })
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
        'Content-Type': 'application/json'
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
