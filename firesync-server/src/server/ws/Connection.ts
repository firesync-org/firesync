import * as Y from 'yjs'

import { docStore } from '../lib/Docs/DocStore'

import {
  AuthError,
  BadRequestError,
  FiresyncError,
  MessageEncodingError
} from '../../shared/errors'
import {
  decodeMessage,
  encodeMessage,
  Message,
  MessageType,
  SubscribeRequestMessage,
  StateVectorMessage,
  UpdateMessage,
  UnsubscribeRequestMessage
} from '../../shared/protocol'

import { UserId } from '../auth/types'
import { auth } from '../auth/auth'
import { logging } from '../lib/Logging/Logger'
import EventEmitter from 'events'
import { WebSocketTransport } from './WebSockets'

const logger = logging.child('connection')

export declare interface Connection {
  on(event: 'error', listener: (error: Error) => void): this
  on(
    event: 'subscribe',
    listener: (docKey: string, docId: number) => void
  ): this
}

export class Connection extends EventEmitter {
  id: number
  static nextId = 0
  ws: WebSocketTransport
  docKeysByDocIds = new Map<number, string>()
  docIdsByDocKeys = new Map<string, number>()
  userId: UserId
  projectId: string

  constructor(options: {
    ws: WebSocketTransport
    userId: UserId
    projectId: string
  }) {
    super()
    this.ws = options.ws
    this.userId = options.userId
    this.projectId = options.projectId
    this.id = Connection.nextId++
  }

  async onMessage(data: Buffer, source: string) {
    let message: Message
    try {
      message = decodeMessage(new Uint8Array(data as Buffer))
    } catch (error) {
      this.handleError(new MessageEncodingError(`Unable to decode message`))
      return
    }

    switch (message.messageType) {
      case MessageType.SUBSCRIBE_REQUEST:
        await this.handleIncomingSubscribeRequest(message)
        break
      case MessageType.UNSUBSCRIBE_REQUEST:
        await this.handleIncomingUnsubscribeRequest(message)
        break
      case MessageType.SYNC_STATE_VECTOR:
        await this.handleIncomingStateVector(message)
        break
      case MessageType.UPDATE:
        await this.handleIncomingUpdates(message, source)
        break
      default:
        this.handleError(
          new BadRequestError(`Unknown message type: ${message.messageType}`)
        )
    }
  }

  async handleIncomingSubscribeRequest({ docKey }: SubscribeRequestMessage) {
    logger.debug({ docKey }, 'handleIncomingSubscribeRequest')

    const docIdString = await docStore.getDocId(this.projectId, docKey)
    if (docIdString === undefined) {
      const error = new AuthError(
        `Not authorized to read doc, or doc does not exist: ${docKey}`
      )
      this.sendSubscribeError(docKey, error.name, error.message)
      return
    }
    const docId = parseInt(docIdString)

    if (this.docKeysByDocIds.has(docId)) {
      // We could just ignore a client trying to subscribe to the same doc twice
      // but it's not something a well-behaved client should try to do, so let's
      // encourage good client behaviour.
      const error = new BadRequestError(`Already subscribed to doc: ${docKey}`)
      this.sendSubscribeError(docKey, error.name, error.message)
      return
    }

    const canReadDoc = await auth.canReadDoc(this.userId, docId)
    if (canReadDoc) {
      this.docKeysByDocIds.set(docId, docKey)
      this.docIdsByDocKeys.set(docKey, docId)
      Connection.saveConnectionByDocId(docId, this)
      this.sendSubscribeResponse(docKey, docId)
    } else {
      const error = new AuthError(
        `Not authorized to read doc, or doc does not exist: ${docKey}`
      )
      this.sendSubscribeError(docKey, error.name, error.message)
    }
  }

  async sendSubscribeResponse(docKey: string, docId: number) {
    logger.debug({ docKey }, 'sendSubscribeResponse')

    this.ws.send(
      encodeMessage({
        messageType: MessageType.SUBSCRIBE_RESPONSE,
        sessionDocId: docId,
        docKey
      })
    )
  }

  async sendSubscribeError(
    docKey: string,
    errorType: string,
    errorMessage: string
  ) {
    logger.debug({ docKey, errorType, errorMessage }, 'sendSubscribeError')
    this.ws.send(
      encodeMessage({
        messageType: MessageType.SUBSCRIBE_ERROR,
        docKey,
        errorType,
        errorMessage
      })
    )
  }

  async handleIncomingUnsubscribeRequest({
    sessionDocId: docId
  }: UnsubscribeRequestMessage) {
    const docKey = this.docKeysByDocIds.get(docId)
    logger.debug({ docId, docKey }, 'handleIncomingUnsubscribeRequest')
    if (docKey === undefined) {
      const error = new BadRequestError(`Not subscribed to docId: ${docId}`)
      this.sendUnsubscribeError(docId, error.name, error.message)
      return
    }
    this.docIdsByDocKeys.delete(docKey)
    this.docKeysByDocIds.delete(docId)
    Connection.removeConnectionFromDocId(docId, this)

    await this.sendUnsubscribeResponse(docId)
  }

  async sendUnsubscribeResponse(docId: number) {
    logger.debug({ docId }, 'sendUnsubscribeResponse')

    this.ws.send(
      encodeMessage({
        messageType: MessageType.UNSUBSCRIBE_RESPONSE,
        sessionDocId: docId
      })
    )
  }

  async sendUnsubscribeError(
    docId: number,
    errorType: string,
    errorMessage: string
  ) {
    logger.debug({ docId, errorType, errorMessage }, 'sendUnsubscribeError')
    this.ws.send(
      encodeMessage({
        messageType: MessageType.UNSUBSCRIBE_ERROR,
        sessionDocId: docId,
        errorType,
        errorMessage
      })
    )
  }

  async sendStateVector(docId: string) {
    const sv = await docStore.getStateVector(docId)
    logger.debug({ docId, sv }, 'sendStateVector')

    this.ws.send(
      encodeMessage({
        messageType: MessageType.SYNC_STATE_VECTOR,
        sessionDocId: parseInt(docId),
        stateVector: Y.encodeStateVector(sv)
      })
    )
  }

  async handleIncomingStateVector({
    stateVector: sv,
    sessionDocId: docId
  }: StateVectorMessage) {
    const docKey = this.getDocKeyFromDocIdOrError(docId)
    if (docKey === null) return

    logger.debug({ docKey, sv }, 'handleIncomingStateVector')

    // Send the client any updates it is missing from its state vector
    const update = await docStore.getStateAsUpdate(docId.toString(), sv)
    logger.debug(
      { docKey, update },
      'handleIncomingStateVector: responding with updates'
    )
    this.sendUpdate(docId, update)

    // When the client sends a state vector, this is the start of a
    // two sync, so send our state vector back to get any updates from
    // the client we don't have.
    this.sendStateVector(docId.toString())
  }

  async sendUpdate(docId: number, update: Uint8Array) {
    logger.debug({ docId, update }, 'sendUpdate')

    const updates = new Map([[docId, update]])

    this.ws.send(
      encodeMessage({
        messageType: MessageType.UPDATE,
        // Don't need unique update ids since client doesn't send an ACK
        updateId: 0,
        updates
      })
    )
  }

  async handleIncomingUpdates(
    { updates, updateId }: UpdateMessage,
    source: string
  ) {
    for (const [docId] of Array.from(updates)) {
      // Ensure we are subscribed to this doc
      const docKey = this.getDocKeyFromDocIdOrError(docId)
      if (docKey === null) return

      const canWrite = await auth.canWriteDoc(this.userId, docId)
      if (!canWrite) {
        const error = new AuthError(`Not authorized to write doc: ${docId}`)
        this.sendUpdateError(updateId, error.name, error.message)
        return
      }
    }

    await Promise.all(
      Array.from(updates).map(async ([docId, update]) => {
        logger.debug({ docId, update, updateId }, 'handleIncomingUpdates')
        await docStore.applyUpdate(docId.toString(), update, source)
      })
    )

    this.sendUpdateAck(updateId)
  }

  async sendUpdateAck(updateId: number) {
    logger.debug({ updateId }, 'sendUpdateAck')
    this.ws.send(
      encodeMessage({
        messageType: MessageType.UPDATE_ACK,
        updateId
      })
    )
  }

  async sendUpdateError(
    updateId: number,
    errorType: string,
    errorMessage: string
  ) {
    logger.debug({ updateId, errorType, errorMessage }, 'sendUpdateError')
    this.ws.send(
      encodeMessage({
        messageType: MessageType.UPDATE_ERROR,
        updateId,
        errorType,
        errorMessage
      })
    )
  }

  async sendErrorResync(
    docId: number,
    errorType: string,
    errorMessage: string
  ) {
    logger.debug({ docId, errorType, errorMessage }, 'sendErrorResync')

    this.ws.send(
      encodeMessage({
        messageType: MessageType.ERROR_RESYNC,
        sessionDocId: docId,
        errorType,
        errorMessage
      })
    )
  }

  async sendErrorFatal(errorType: string, errorMessage: string) {
    logger.debug({ errorType, errorMessage }, 'sendErrorFatal')

    this.ws.send(
      encodeMessage({
        messageType: MessageType.ERROR_FATAL,
        errorType,
        errorMessage
      })
    )
  }

  private getDocIdFromDocKeyOrError(docKey: string) {
    const docId = this.docIdsByDocKeys.get(docKey)
    if (docId === undefined) {
      const error = new BadRequestError(`Doc is not subscribed: ${docKey}`)
      this.handleError(error)
      return null
    }
    return docId
  }

  private getDocKeyFromDocIdOrError(docId: number) {
    const docKey = this.docKeysByDocIds.get(docId)
    if (docKey === undefined) {
      const error = new BadRequestError(
        `No doc subscribed with session id: ${docId}`
      )
      this.handleError(error)
      return null
    }
    return docKey
  }

  private handleError(error: FiresyncError) {
    this.sendErrorFatal(error.name, error.message)
    this.emit('error', error)
  }

  onClose() {
    this.docIdsByDocKeys.forEach((docId) =>
      Connection.removeConnectionFromDocId(docId, this)
    )
  }

  // eslint-disable-next-line no-use-before-define
  static connectionsByDocId: Record<string, Connection[]> = {}

  static saveConnectionByDocId(docId: number, conn: Connection) {
    if (!(this.connectionsByDocId[docId] instanceof Array)) {
      this.connectionsByDocId[docId] = []
    }
    this.connectionsByDocId[docId]!.push(conn)
  }

  static removeConnectionFromDocId(docId: number, conn: Connection) {
    logger.debug({ docId }, 'removeConnectionFromDocName')
    this.connectionsByDocId[docId] = (
      this.connectionsByDocId[docId] || []
    ).filter((c) => c !== conn)
  }

  static listenForDocUpdates() {
    docStore.on(
      'update',
      (docId: number, update: Uint8Array, source: string) => {
        const connections = this.connectionsByDocId[docId] || []
        for (const conn of connections) {
          const originatedFromConn = source === `external:ws:${conn.id}`
          if (!originatedFromConn) {
            conn.sendUpdate(docId, update)
          }
        }
      }
    )

    docStore.on('error', (docId: number, error: Error, source: string) => {
      const connections = this.connectionsByDocId[docId] || []
      for (const conn of connections) {
        const originatedFromConn = source === `external:ws:${conn.id}`
        if (originatedFromConn) {
          conn.sendErrorResync(docId, error.name, error.message)
        }
      }
    })
  }
}

Connection.listenForDocUpdates()
