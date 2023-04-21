import { IncomingMessage } from 'http'
import { WebSocketServer, WebSocket, RawData } from 'ws'
import { Connection } from './Connection'
import { Session, auth } from './auth'
import { logging } from '../lib/Logging/Logger'
import EventEmitter from 'events'
import internal from 'stream'
import { projects } from '../models/projects'
import { HttpError } from '../http/helpers/errors'
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
    session: Session
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
    this.connection.onMessage(data as Buffer)
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
    if (this.chaosMonkey.refuseConnections) {
      logger.debug({}, 'chaosMonkey is refusing connection')
      socket.destroy()
      return
    }

    let session: Session
    let project: Awaited<ReturnType<typeof projects.getProjectFromRequest>>
    try {
      project = await projects.getProjectFromRequest(request)
      session = await auth.getSessionFromRequest(request)
    } catch (error) {
      logger.error({ error }, 'error establishing connection')
      if (error instanceof HttpError) {
        socket.write(
          `HTTP/1.1 ${error.httpStatusCode} ${error.meaning}\r\n\r\n`
        )
        socket.destroy()
        return
      } else {
        throw error
      }
    }
    const projectId = project.id

    logger.info({ projectId }, 'websocket connected')

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.initializeConnection(ws, session, projectId)
    })
  }

  initializeConnection(ws: WebSocket, session: Session, projectId: string) {
    const connection = new WebSocketTransport({
      ws,
      chaosMonkey: this.chaosMonkey,
      session,
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
