import * as Y from 'yjs'
import { EventEmitter } from 'events'

import {
  decodeMessage,
  encodeMessage,
  Message,
  MessageType,
  SubscribeErrorMessage,
  SubscribeResponseMessage,
  ErrorResyncMessage,
  StateVectorMessage,
  UpdateMessage,
  UpdateAckMessage,
  UpdateErrorMessage,
  ErrorFatalMessage,
  UnsubscribeResponseMessage,
  UnsubscribeErrorMessage
} from './shared/protocol.js'
import logging from './logging.js'
import {
  AuthError,
  BadParameterError,
  BadRequestError,
  ErrorsByName,
  UnexpectedInternalStateError
} from './shared/errors.js'

const logger = logging('connection')

export declare interface Connection {
  on(event: 'message', listener: (message: Message) => void): this
  on(event: 'error', listener: (error: Error) => void): this
  on(
    event: 'update',
    listener: (docKey: string, update: Uint8Array) => void
  ): this
}

const SECONDS = 1000

enum SubscriptionStates {
  SUBSCRIBING,
  SUBSCRIBED,
  UNSUBSCRIBING,
  UNSUBSCRIBED
}

type DocState = {
  docKey: string
  ydoc: Y.Doc
  currentSubscriptionState: SubscriptionStates
  desiredSubscriptionState: SubscriptionStates
  sentInitialUpdate: boolean
  sessionDocId?: number
}

export class Connection extends EventEmitter {
  private ws?: WebSocket | null
  private baseUrl: string
  private WebSocket: typeof WebSocket
  private websocketOptions: any
  private docs = new Map<string, DocState>()

  // Used for configuring options that are generally only useful for testing
  // and we definitely don't want to be different in real usage.
  chaosMonkey = {
    syncAfterSubscribe: true,
    ignoreUpdatesFromDocs: new Set<string>()
  }

  constructor(
    baseUrl: string,
    {
      connect = true,
      CustomWebSocket = WebSocket,
      websocketOptions = undefined
    }: {
      connect?: boolean
      CustomWebSocket?: any
      websocketOptions?: any
    } = {}
  ) {
    super()

    this.baseUrl = baseUrl
    this.WebSocket = CustomWebSocket
    if (!this.WebSocket) {
      throw new BadParameterError(
        'No global WebSocket found, please pass WebSocket constructor as option'
      )
    }
    this.websocketOptions = websocketOptions

    if (connect) {
      this.connect()
    }
  }

  send(message: Uint8Array) {
    if (!this._connected || !this.ws) {
      // TODO: Queue these messages and send on connection?
      logger.error('Attempting to send message while not connected')
      return
    }
    this.ws.send(message)
  }

  yDocUpdateHandler(docKey: string, update: Uint8Array, origin: any) {
    this.recordActivity()
    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      throw new UnexpectedInternalStateError(
        `yDocHandler called for doc that doesn't exist: ${docKey}`
      )
    }
    if (this._connected) {
      if (
        // Don't send updates that originally came from the server
        origin !== this &&
        // Only send updates after we've sent our initial batch of
        // pending updates during the initial sync. Otherwise we
        // might send an update that is later than one the server
        // doesn't have yet.
        doc.sentInitialUpdate &&
        // Only send updates if we're subscribed. Otherwise, the update
        // will get synced during the initial sync after subscription
        doc.currentSubscriptionState === SubscriptionStates.SUBSCRIBED
      ) {
        this.sendUpdate(docKey, update)
      }
    } else {
      // We will do a full resync on reconnect, so don't need to
      // worry about dropping this update for now.
      // But do try to reconnect immediately if we've got new updates
      // to send
      if (this._wantToBeConnected) {
        this.reconnectWithDelay({ soon: true })
      }
    }
  }

  websocketMessageHandler(event: MessageEvent) {
    let message: Message
    try {
      message = decodeMessage(new Uint8Array(event.data))
    } catch (error) {
      if (error instanceof BadRequestError) {
        // An invalid message is most likely a future change to the protocol
        console.error(
          'Unknown message from server. Please upgrade firesync-client to latest version.'
        )
      }
      if (error instanceof Error) {
        return this.handleError(error)
      } else {
        throw error
      }
    }

    this.emit('message', message)

    if (message.messageType === MessageType.UPDATE) {
      this.recordActivity()
    }

    this.handleSyncMessage(message)
  }

  handleError(error: Error) {
    if (error instanceof BadRequestError) {
      // Server sent something malformed that we didn't expect, so try
      // disconnecting and reconnecting
      this.reconnect()
    }

    if (this.listenerCount('error') > 0) {
      this.emit('error', error)
    } else {
      console.error(
        "No registered listeners for error event, so throwing error. Register a listener with connection.on('error') to avoid this."
      )
      throw error
    }
  }

  // Sync Protocol
  private handleSyncMessage(message: Message) {
    switch (message.messageType) {
      case MessageType.SUBSCRIBE_RESPONSE:
        this.handleSubscribeResponse(message)
        break
      case MessageType.SUBSCRIBE_ERROR:
        this.handleSubscribeError(message)
        break
      case MessageType.UNSUBSCRIBE_RESPONSE:
        this.handleUnsubscribeResponse(message)
        break
      case MessageType.UNSUBSCRIBE_ERROR:
        this.handleUnsubscribeError(message)
        break
      case MessageType.SYNC_STATE_VECTOR:
        this.handleIncomingStateVector(message)
        break
      case MessageType.UPDATE:
        this.handleIncomingUpdate(message)
        break
      case MessageType.UPDATE_ACK:
        this.handleIncomingUpdateAck(message)
        break
      case MessageType.UPDATE_ERROR:
        this.handleIncomingUpdateError(message)
        break
      case MessageType.ERROR_RESYNC:
        this.handleIncomingErrorResync(message)
        break
      case MessageType.ERROR_FATAL:
        this.handleIncomingErrorFatal(message)
        break
      default:
        this.handleError(
          new BadRequestError(`Unknown message type: ${message.messageType}`)
        )
    }
  }

  // The client and server talk in session ids, which are short hands
  // for specific docs to avoid sending the entire doc name with each
  // small update. We get assigned a session id for each doc from the
  // server, and track the mapping here as in this.docs.sessionDocId
  private docKeysByDocIds: Record<number, string> = {}
  private resetSubscribedDocs() {
    this.docKeysByDocIds = {}
    this.docs.forEach((doc) => {
      delete doc.sessionDocId
    })
  }

  subscribe(docKey: string, ydoc?: Y.Doc) {
    // Make sure we have a doc and that we aren't overwriting an
    // existing one
    let doc = this.docs.get(docKey)
    if (doc === undefined) {
      if (ydoc === undefined) {
        ydoc = new Y.Doc()
      }
      doc = {
        docKey,
        ydoc,
        desiredSubscriptionState: SubscriptionStates.SUBSCRIBED,
        currentSubscriptionState: SubscriptionStates.UNSUBSCRIBED,
        sentInitialUpdate: false
      }
      ydoc.on('update', (update: Uint8Array, origin: any) => {
        if (!this.chaosMonkey.ignoreUpdatesFromDocs.has(docKey)) {
          this.yDocUpdateHandler(docKey, update, origin)
        }
      })
      this.docs.set(docKey, doc)
    } else {
      if (ydoc !== undefined && doc.ydoc !== ydoc) {
        throw new Error(
          `Already subscribed to ${docKey} with an existing Y.Doc`
        )
      }
      ydoc = doc.ydoc
    }

    // We might be re-subscribing to an existing unsubscribed doc
    doc.desiredSubscriptionState = SubscriptionStates.SUBSCRIBED

    // Subscribe if we aren't already. We don't need to do anything if we're
    // UNSUBSCRIBING because handleUnsubscribeResponse checks if we want to be
    // subscribed and triggers sendSubscribeRequest if so
    if (doc.currentSubscriptionState === SubscriptionStates.UNSUBSCRIBED) {
      this.sendSubscribeRequestIfConnected(docKey)
    }

    return ydoc
  }

  unsubscribe(docKey: string) {
    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      throw new UnexpectedInternalStateError(
        `connection is not subscribed to ${docKey}`
      )
    }

    doc.desiredSubscriptionState = SubscriptionStates.UNSUBSCRIBED

    // Unsubscribe if we aren't already. We don't need to do anything if we're
    // SUBSCRIBING because handleSubscribeResponse checks if we want to be
    // unsubscribed and triggers sendUnsubscribeRequest if so
    if (doc.currentSubscriptionState === SubscriptionStates.SUBSCRIBED) {
      this.sendUnsubscribeRequest(docKey)
    }
  }

  isSubscribed(docKey: string) {
    return (
      this.docs.get(docKey)?.currentSubscriptionState ===
      SubscriptionStates.SUBSCRIBED
    )
  }

  isSubscribing(docKey: string) {
    return (
      this.docs.get(docKey)?.currentSubscriptionState ===
      SubscriptionStates.SUBSCRIBING
    )
  }

  isUnsubscribed(docKey: string) {
    return (
      this.docs.get(docKey)?.currentSubscriptionState ===
      SubscriptionStates.UNSUBSCRIBED
    )
  }

  isUnsubscribing(docKey: string) {
    return (
      this.docs.get(docKey)?.currentSubscriptionState ===
      SubscriptionStates.UNSUBSCRIBING
    )
  }

  sendSubscribeRequest(docKey: string) {
    logger.debug('Sending subscription request', docKey)

    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      this.handleError(
        new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
      )
      return
    }
    doc.currentSubscriptionState = SubscriptionStates.SUBSCRIBING

    this.send(
      encodeMessage({
        messageType: MessageType.SUBSCRIBE_REQUEST,
        docKey
      })
    )
  }

  sendSubscribeRequestIfConnected(docKey: string) {
    if (this._connected) {
      this.sendSubscribeRequest(docKey)
    }
  }

  private handleSubscribeResponse({
    docKey,
    sessionDocId
  }: SubscribeResponseMessage) {
    logger.debug('Received subscribe response', docKey, sessionDocId)

    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      this.handleError(
        new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
      )
      return
    }
    doc.currentSubscriptionState = SubscriptionStates.SUBSCRIBED
    doc.sessionDocId = sessionDocId
    this.docKeysByDocIds[sessionDocId] = docKey

    if (doc.desiredSubscriptionState === SubscriptionStates.UNSUBSCRIBED) {
      // We might have been unsubscribed while we were subscribing
      this.sendUnsubscribeRequest(docKey)
    } else {
      // It's sometimes useful in testing to not do the initial state vector
      // sync so we can monitor it happening. This should always happen in
      // regular usage though.
      if (this.chaosMonkey.syncAfterSubscribe) {
        this.sendStateVector(docKey)
      }
    }
  }

  private handleSubscribeError({
    docKey,
    errorType,
    errorMessage
  }: SubscribeErrorMessage) {
    logger.debug('Received subscribe error', {
      docKey,
      errorType,
      errorMessage
    })
    const error = this.buildError(errorType, errorMessage)
    this.handleError(error)
  }

  sendUnsubscribeRequest(docKey: string) {
    logger.debug('Send unsubscribe request', {
      docKey
    })

    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      this.handleError(
        new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
      )
      return
    }
    doc.currentSubscriptionState = SubscriptionStates.UNSUBSCRIBING

    const sessionDocId = doc.sessionDocId
    if (sessionDocId === undefined) {
      this.handleError(
        new BadParameterError(`Doc is not subscribed: ${docKey}`)
      )
      return
    }

    logger.debug('Sending unsubscribe request', { docKey, sessionDocId })

    this.send(
      encodeMessage({
        messageType: MessageType.UNSUBSCRIBE_REQUEST,
        sessionDocId
      })
    )
  }

  sendUnsubscribeRequestIfConnected(docKey: string) {
    if (this._connected) {
      this.sendUnsubscribeRequest(docKey)
    }
  }

  private handleUnsubscribeResponse({
    sessionDocId
  }: UnsubscribeResponseMessage) {
    logger.debug('Received unsubscribe response', sessionDocId)

    const docKey = this.docKeysByDocIds[sessionDocId]

    if (docKey === undefined) {
      this.handleError(
        new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
      )
      return
    }

    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      this.handleError(
        new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
      )
      return
    }

    doc.currentSubscriptionState = SubscriptionStates.UNSUBSCRIBED
    delete doc.sessionDocId
    delete this.docKeysByDocIds[sessionDocId]

    if (doc.desiredSubscriptionState === SubscriptionStates.SUBSCRIBED) {
      // We might have been unsubscribed while we were subscribing
      this.sendSubscribeRequest(docKey)
    }
  }

  private handleUnsubscribeError({
    sessionDocId,
    errorType,
    errorMessage
  }: UnsubscribeErrorMessage) {
    logger.debug('Received unsubscribe error', {
      sessionDocId,
      errorType,
      errorMessage
    })
    const error = this.buildError(errorType, errorMessage)
    this.handleError(error)
  }

  sendStateVector(docKey: string) {
    logger.debug('Sending client state vector', docKey)

    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      this.handleError(
        new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
      )
      return
    }

    const sessionDocId = doc.sessionDocId
    if (sessionDocId === undefined) {
      this.handleError(
        new BadParameterError(`Doc is not subscribed: ${docKey}`)
      )
      return
    }

    const sv = Y.encodeStateVector(doc.ydoc)

    this.send(
      encodeMessage({
        messageType: MessageType.SYNC_STATE_VECTOR,
        sessionDocId,
        stateVector: sv
      })
    )
  }

  private handleIncomingStateVector({
    sessionDocId,
    stateVector: sv
  }: StateVectorMessage) {
    const docKey = this.docKeysByDocIds[sessionDocId]
    if (docKey === undefined) {
      // Doc has been unsubscribed while this was inflight
      return
    }

    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      this.handleError(
        new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
      )
      return
    }

    logger.debug('Received server state vector', { docKey }, () =>
      Y.decodeStateVector(sv)
    )

    const update = Y.encodeStateAsUpdate(doc.ydoc, sv)
    const { structs, ds } = Y.decodeUpdate(update)
    if (structs.length > 0 || ds.clients.size > 0) {
      this.sendUpdate(docKey, update)
    }
    doc.sentInitialUpdate = true
  }

  hasSentInitialUpdate(docKey: string) {
    return this.docs.get(docKey)?.sentInitialUpdate === true
  }

  private _pendingUpdates = new Map<number, Uint8Array[]>()
  private _inflightUpdateId: number | null = null

  get hasPendingUpdates() {
    return this._pendingUpdates.size > 0
  }

  get hasInflightUpdates() {
    return this._inflightUpdateId !== null
  }

  private _updatesSentCount = 0
  get updatesSentCount() {
    return this._updatesSentCount
  }

  sendUpdate(docKey: string, update: Uint8Array) {
    logger.debug('Sending update', docKey, () => Y.decodeUpdate(update))

    const doc = this.docs.get(docKey)
    if (doc === undefined) {
      this.handleError(
        new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
      )
      return
    }

    const sessionDocId = doc.sessionDocId
    if (sessionDocId === undefined) {
      this.handleError(
        new BadParameterError(`Doc is not subscribed: ${docKey}`)
      )
      return
    }

    let pendingUpdates = this._pendingUpdates.get(sessionDocId)
    if (!pendingUpdates) {
      pendingUpdates = []
      this._pendingUpdates.set(sessionDocId, pendingUpdates)
    }
    pendingUpdates.push(update)

    this.flushUpdates()
  }

  private flushUpdates() {
    logger.debug('Flushing updates', {
      pendingUpdatesSize: this._pendingUpdates.size,
      inflightUpdateId: this._inflightUpdateId
    })

    if (this.hasPendingUpdates && !this.hasInflightUpdates) {
      const updates = new Map(
        Array.from(this._pendingUpdates).map(([sessionDocId, updates]) => {
          return [sessionDocId, Y.mergeUpdates(updates)]
        })
      )
      this._pendingUpdates = new Map()

      // updateId just needs to be unique for the UPDATE_ACK
      const updateId = this._updatesSentCount++
      this._inflightUpdateId = updateId

      this.send(
        encodeMessage({
          messageType: MessageType.UPDATE,
          updateId,
          updates
        })
      )
    }
  }

  private handleIncomingUpdateAck({ updateId }: UpdateAckMessage) {
    logger.debug('Received server update ack', { updateId })

    if (this._inflightUpdateId === updateId) {
      this._inflightUpdateId = null
      // Send next batch of pending updates if present
      this.flushUpdates()
    } else {
      this.handleError(
        new BadRequestError(
          `Unexpected updateId in Update ACK: ${updateId}. Expected ${this._inflightUpdateId}`
        )
      )
    }
  }

  private handleIncomingUpdateError({
    updateId,
    errorType,
    errorMessage
  }: UpdateErrorMessage) {
    logger.debug('Received update error', {
      updateId,
      errorType,
      errorMessage
    })
    const error = this.buildError(errorType, errorMessage)
    this.handleError(error)
  }

  private handleIncomingUpdate({ updates }: UpdateMessage) {
    updates.forEach((update, sessionDocId) => {
      const docKey = this.docKeysByDocIds[sessionDocId]
      if (docKey === undefined) {
        // Doc has been unsubscribed while this was inflight
        return
      }

      const doc = this.docs.get(docKey)
      if (doc === undefined) {
        this.handleError(
          new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
        )
        return
      }

      logger.debug('Received server update', { docKey }, () =>
        Y.decodeUpdate(update)
      )

      Y.applyUpdate(doc.ydoc, update, this)

      this.emit('update', docKey, update)
    })
  }

  private handleIncomingErrorResync({
    errorType,
    errorMessage
  }: ErrorResyncMessage) {
    logger.debug('Received resync error', { errorType, errorMessage })
    // TODO: Resync doc on this error
    const error = this.buildError(errorType, errorMessage)
    this.handleError(error)
  }

  private handleIncomingErrorFatal({
    errorType,
    errorMessage
  }: ErrorFatalMessage) {
    logger.debug('Received fatal error', { errorType, errorMessage })
    const error = this.buildError(errorType, errorMessage)
    this.handleError(error)
  }

  private buildError(errorType: string, errorMessage: string) {
    const ErrorClass = ErrorsByName[errorType] || Error
    const error = new ErrorClass(errorMessage)
    return error
  }

  // Connection Logic
  // ----------------
  // connected records whether we have an active websocket connection
  // open or not.
  private _connected = false
  get connected() {
    return this._connected
  }

  private _connecting = false
  get connecting() {
    return this._connecting
  }

  // wantToBeConnected is set when connect() is called and unset when
  // disconnect() is called. It prevents us trying to reconnect if we've
  // been explicitly disconnected.
  private _wantToBeConnected = false
  get wantToBeConnected() {
    return this._wantToBeConnected
  }

  // When our connection drops, but we still want to be connected, we
  // will start trying to reconnect with a back-off. We start at a randomised
  // delay based on time since lastActivityTimestamp, and then exponentially
  // increase with a factor of connectionDelayIncreaseFactor up to maxConnectionAttemptDelay.
  private _nextConnectionAttemptDelay: number | null = null
  get nextConnectionAttemptDelay() {
    return this._nextConnectionAttemptDelay
  }

  private _nextConnectionAttemptTimeout:
    | ReturnType<typeof setTimeout>
    | undefined

  get nextConnectionAttemptTimeout() {
    return this._nextConnectionAttemptTimeout
  }

  private lastActivityTimestamp: number | null = null
  connectionDelayIncreaseFactor = 1.5
  minConnectionAttemptDelay = 1 * SECONDS
  maxConnectionAttemptDelay = 30 * SECONDS
  // Stop reconnecting if we haven't connected after stopConnectionAttemptsAfter
  // If an update or activity happens, we will still try to reconnect
  stopConnectionAttemptsAfter = 60 * SECONDS
  private _startedConnectionAttemptsAt: number | null = null
  // If the user starts typing, then reconnect soon, with
  // soonConnectionAttemptDelayThreshold as our definition of 'soon'.
  soonConnectionAttemptDelayThreshold = 5 * SECONDS
  // Some record keeping for testing and debugging
  private _connectsCount = 0
  get connectsCount() {
    return this._connectsCount
  }

  private _connectionAttempts = 0
  get connectionAttempts() {
    return this._connectionAttempts
  }

  private _disconnectsCount = 0
  get disconnectsCount() {
    return this._disconnectsCount
  }

  async connect() {
    this._connectionAttempts++
    this._wantToBeConnected = true

    logger.debug(
      {
        connected: this.connected,
        connecting: this.connecting
      },
      'connect'
    )

    if (this._connected || this._connecting) return

    this._connecting = true

    this.docs.forEach((doc) => {
      doc.sentInitialUpdate = false
      doc.currentSubscriptionState = SubscriptionStates.UNSUBSCRIBED
    })

    // http:// -> ws://, https:// -> wss://
    // TODO: What about // as a protocol?
    const url = this.baseUrl.replace(/^http/, 'ws')

    if (this.ws) {
      throw new UnexpectedInternalStateError(
        'Unexpectedly trying to create new WebSocket while existing socket is live'
      )
    }
    this.ws = new this.WebSocket(url, this.websocketOptions)
    this.ws.binaryType = 'arraybuffer'

    this.resetSubscribedDocs()

    this.ws.onopen = () => {
      this._connected = true
      this._connecting = false
      this._connectsCount++
      this.resetReconnectionAttempts()

      this.docs.forEach((doc) => {
        if (doc.desiredSubscriptionState === SubscriptionStates.SUBSCRIBED) {
          this.sendSubscribeRequest(doc.docKey)
        }
      })
    }

    this.ws.onmessage = this.websocketMessageHandler.bind(this)

    this.ws.onerror = (event) => {
      this._connected = false
      this._connecting = false
      const message = (event as any).message as string | undefined
      logger.log('ws.onerror', message || 'Unexpected error')
      if (message?.match(/401/)) {
        const error = new AuthError(message)
        this.handleError(error)
      }
    }

    this.ws.onclose = () => {
      logger.debug(
        {
          wantToBeConnected: this._wantToBeConnected
        },
        'ws.onclose'
      )
      this._connected = false
      this._connecting = false
      this._disconnectsCount++
      if (this._wantToBeConnected) {
        this.reconnectWithDelay()
      }
      this.ws = null
    }
  }

  disconnect() {
    this._wantToBeConnected = false
    if (this.ws) {
      this.ws.close()
    }
  }

  reconnect() {
    this._wantToBeConnected = true
    if (this.ws) {
      this.ws.close()
    }
    this.connect()
  }

  private reconnectWithDelay({ soon = false }: { soon?: boolean } = {}) {
    // Overview of reconnectWithDelay logic
    // ------------------------------------
    // * Create a setTimeout to attempt a reconnect after nextConnectionAttemptDelay ms.
    // * If nextConnectionAttemptDelay isn't set yet, initialize it with random jitter.
    // * If nextConnectionAttemptTimeout exists then a setTimeout is already in progress so
    //   we don't need to do anything
    // * If soon = true, then clear any existing setTimeout, and set nextConnectionAttemptDelay
    //   based on soonConnectionAttemptDelayThreshold. This ensures we reconnect soon.
    // * Increase nextConnectionAttemptDelay by connectionDelayIncreaseFactor so that the next
    //   connection attempt is further delayed, up to maxConnectionAttemptDelay

    if (soon) {
      if (
        this._nextConnectionAttemptDelay === null ||
        this._nextConnectionAttemptDelay >
          this.soonConnectionAttemptDelayThreshold
      ) {
        // Jump ahead of an existing running setTimeout which might be running
        // with a long delay if we've been trying to reconnect for a while
        this.resetReconnectionAttempts()
        this._nextConnectionAttemptDelay =
          this.getInitialConnectionAttemptDelay({
            max: this.soonConnectionAttemptDelayThreshold
          })
      }
    }

    if (!this._startedConnectionAttemptsAt) {
      this._startedConnectionAttemptsAt = Date.now()
    }

    if (!this._nextConnectionAttemptDelay) {
      this._nextConnectionAttemptDelay = this.getInitialConnectionAttemptDelay()
    }

    const alreadyReconnecting = !!this._nextConnectionAttemptTimeout

    const connectionAttemptsDuration =
      Date.now() - this._startedConnectionAttemptsAt
    const stopConnectionAttempts =
      connectionAttemptsDuration > this.stopConnectionAttemptsAfter

    logger.debug(
      {
        nextConnectionAttemptDelay: this._nextConnectionAttemptDelay,
        alreadyReconnecting,
        stopConnectionAttempts,
        soon
      },
      'reconnecting with delay'
    )

    if (alreadyReconnecting) {
      return
    }

    if (stopConnectionAttempts) {
      this.resetReconnectionAttempts()
      return
    }

    this._nextConnectionAttemptTimeout = setTimeout(() => {
      this._nextConnectionAttemptTimeout = undefined
      if (this._wantToBeConnected) {
        this.connect()
      }
    }, this._nextConnectionAttemptDelay)

    // Increase delay exponentially up to maxConnectionAttemptDelay
    this._nextConnectionAttemptDelay = Math.min(
      this._nextConnectionAttemptDelay * this.connectionDelayIncreaseFactor,
      this.maxConnectionAttemptDelay
    )
  }

  private reconnectNow() {
    this.resetReconnectionAttempts()
    this.connect()
  }

  private resetReconnectionAttempts() {
    this._nextConnectionAttemptDelay = null
    clearTimeout(this._nextConnectionAttemptTimeout)
    this._nextConnectionAttemptTimeout = undefined
    this._startedConnectionAttemptsAt = null
  }

  private getInitialConnectionAttemptDelay({
    max = this.maxConnectionAttemptDelay
  }: { max?: number } = {}) {
    // Base the size of our initial delay on how active the connection is.
    // If there is recent activity then connect within a similar time period.
    // If there is less activity, we can wait longer to reconnect.
    // We will always attempt to reconnect if we get some updates to the doc anyway.

    // If there hasn't been any activity yet, default to connecting again soon.
    let delayMagnitude = this.minConnectionAttemptDelay
    if (this.lastActivityTimestamp) {
      const timeSinceLastActivity = Date.now() - this.lastActivityTimestamp
      logger.debug(
        {
          timeSinceLastActivity
        },
        'timeSinceLastActivity'
      )
      delayMagnitude = Math.min(timeSinceLastActivity, max)
    }

    const delay = Math.max(
      // Don't be less than minConnectionAttemptDelay and in particular
      // don't be zero, otherwise the delay will never increase when multiplied
      // by connectionDelayIncreaseFactor.
      this.minConnectionAttemptDelay,
      1,
      // Randomize the delay to between 0 and delayMagnitude to add some jitter
      // to avoid a stampede of reconnects to the server
      Math.floor(Math.random() * delayMagnitude)
    )

    logger.debug(
      {
        delayMagnitude,
        delay
      },
      'reconnecting with delay'
    )
    return delay
  }

  private recordActivity() {
    this.lastActivityTimestamp = Date.now()
  }
}
