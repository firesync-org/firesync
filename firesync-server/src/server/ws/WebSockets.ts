import { IncomingMessage } from 'http'
import { WebSocketServer, WebSocket, RawData } from 'ws'
import { Connection } from './Connection'
import { auth } from '../auth/auth'
import { logging } from '../lib/Logging/Logger'
import EventEmitter from 'events'
import { UserId } from '../auth/types'
import { db } from '../../db/db'
import internal from 'stream'
const logger = logging.child('websockets')

type ChaosMonkey = {
  disconnectClientsAfter?: number
  refuseConnections?: boolean
}

export class WebSocketTransport extends EventEmitter {
  ws: WebSocket
  id: number
  connection: Connection
  static nextId = 0
  chaosMonkey?: ChaosMonkey

  constructor(options: {
    ws: WebSocket
    chaosMonkey?: ChaosMonkey
    userId: UserId
    projectId: string
  }) {
    super()

    this.connection = new Connection({
      ...options,
      ws: this
    })

    this.connection.on('error', () => {
      // Disconnect client if they are sending bad messages
      // TODO: Rate limit reconnections?
      this.close()
    })

    logger.debug({}, 'WebSocketConnection.constructor')

    this.ws = options.ws
    this.id = WebSocketTransport.nextId++

    this.listenForMessages()

    this.chaosMonkey = options.chaosMonkey || {}
    if (this.chaosMonkey?.disconnectClientsAfter) {
      setTimeout(() => {
        this.terminate()
      }, this.chaosMonkey.disconnectClientsAfter)
    }
  }

  send(message: Uint8Array) {
    this.ws.send(message)
  }

  close() {
    this.ws.close()
  }

  terminate() {
    this.ws.terminate()
  }

  private listenForMessages() {
    this.ws.on('message', (data) => {
      this.onMessage(data)
    })

    this.ws.on('close', () => {
      this.onClose()
    })
  }

  private onMessage(data: RawData) {
    this.connection.onMessage(data as Buffer, `external:ws:${this.id}`)
  }

  private onClose() {
    logger.debug({}, 'onClose')
    this.connection.onClose()
  }
}

export class WebSocketTransports {
  wss: WebSocketServer
  chaosMonkey: ChaosMonkey

  constructor() {
    this.wss = new WebSocketServer({ noServer: true })
    this.chaosMonkey = {}
  }

  async onUpgrade(
    request: IncomingMessage,
    socket: internal.Duplex,
    head: Buffer
  ) {
    const projectName = request.headers.host?.split('.')[0]
    if (projectName === undefined) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
      return
    }

    if (this.chaosMonkey.refuseConnections) {
      logger.debug({ projectName }, 'chaosMonkey is refusing connection')
      socket.destroy()
      return
    }

    const project = await db
      .knex('projects')
      .select('id', 'name', 'cors_allowed_origins')
      .where('name', projectName)
      .first()
    if (project === undefined) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }
    const projectId = project.id

    const userId = await auth.getUserIdFromRequest(request)
    const canConnect = await auth.canConnect(request, userId)
    logger.debug({ canConnect, url: request.url }, 'onUpgrade')

    if (!canConnect) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.initializeConnection(ws, userId, projectId)
    })
  }

  initializeConnection(ws: WebSocket, userId: UserId, projectId: string) {
    const connection = new WebSocketTransport({
      ws,
      chaosMonkey: this.chaosMonkey,
      userId,
      projectId
    })
    return connection
  }

  getConnectionCounts() {
    const connectionCounts: { [docKey: string]: number } = {}
    for (const docKey in Connection.connectionsByDocId) {
      connectionCounts[docKey] = Connection.connectionsByDocId[docKey]!.length
    }
    return connectionCounts
  }

  terminateDocConnections(docId: string) {
    // Only used in testing
    for (const connection of Connection.connectionsByDocId[docId] || []) {
      connection.ws.terminate()
    }
  }
}

export const webSockets = new WebSocketTransports()
