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

  getClient({ token, connect = true }: { token: string; connect?: boolean }) {
    const client = getClient({
      connect,
      token
    })

    this.clients.push(client)

    return client
  }

  async getDocUpdates(docKey: string) {
    const response = await this.fetch(
      `/debug/docs/${encodeURIComponent(docKey)}/updates`
    )
    const data = (await response.json()) as {
      updates: Array<number[]>
    }
    return data.updates.map((update) => Uint8Array.from(update))
  }

  async getDocStateVector(docKey: string) {
    const response = await this.fetch(
      `/debug/docs/${encodeURIComponent(docKey)}/sv`
    )
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

  async packUpdates(docKey: string) {
    await this.fetch(`/debug/docs/${encodeURIComponent(docKey)}/updates/pack`, {
      method: 'POST'
    })
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

  async setConfig(config: {
    packAfterNUpdates?: number
    waitSecondsBeforePacking?: number
    jwtAuthSecrets?: string[]
  }) {
    await this.fetch(`/debug/config`, {
      method: 'POST',
      body: JSON.stringify(config)
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
