import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  removeAwarenessStates
} from 'y-protocols/awareness'
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
  UnsubscribeErrorMessage,
  AwarenessUpdateMessage,
  HandshakeResponseMessage
} from './shared/protocol'
import logging from './logging'
import {
  BadRequestError,
  ErrorsByName,
  UnexpectedInternalStateError
} from './shared/errors'
import { packUpdates } from './shared/yUtils'
import { Connection } from './connection'
import { AwarenessUser, Docs } from './docs'
import { LIB_VERSION } from './version'

const logger = logging('firesync')

/** @ignore */
export const FIRESYNC_SERVER_ORIGIN = Symbol('FIRESYNC_SERVER_ORIGIN')

/** @ignore */
// TODO: Move to event log or similar for testing/debugging
export declare interface FireSync {
  on(event: 'message', listener: (message: Message) => void): this
  on(event: 'error', listener: (error: Error) => void): this
  on(
    event: 'update',
    listener: (docKey: string, update: Uint8Array) => void
  ): this
  on(event: 'updateAck', listener: (updateId: string) => void): this
}

/**
 * Parameters used to configure a new instance of a FireSync client.
 * @typedef FireSyncOptions
 * @type {object}
 * @param {string} token A JWT signed with your project secret with a list of docs that
 * the client can access. See [Authentication](/guides/authentication) for more information
 * @param {string} [baseUrl] The URL of your own firesync-server.
 * @param {string} [projectName] The name of your project in FireSync Cloud.
 * @param {boolean} [connect=true] Whether FireSync should immediately connect to the
 * server. Defaults to `true` if not provided.
 * @param {WebSocket} [CustomWebSocket=window.WebSocket] Can be used to pass in a custom WebSocket
 * implementation. This is useful for using a FireSync client instance on the server, where
 * can pass in the WebSocket implementation from the [`ws` library](https://www.npmjs.com/package/ws).
 * @example
 * ```js
 * new FireSync({
 *   // If using FireSync cloud:
 *   projectName: 'acme-dev',
 *   // Or if using a local firesync-server:
 *   // baseUrl: 'http://localhost:5000',
 *
 *   // A JWT token signed with your project secret
 *   token: 'my-token',
 *
 *   // Whether to connect to the server immediately
 *   connect: true
 * })
 * ```
 */
type UrlOptions =
  | {
      baseUrl: string
      projectName?: string
    }
  | {
      baseUrl?: string
      projectName: string
    }
type FireSyncOptions = UrlOptions & {
  token?: string
  connect?: boolean
  CustomWebSocket?: any
}

/**
 * Options for firesync.subscribeYDoc
 * @typedef SubscribeYDocOptions
 * @type {object}
 * @param {Y.Doc=} [ydoc] An optional existing Y.Doc to use rather than returning a new instance
 * @param {function} [initialize] A method which is called with the ydoc to set some
 * initial content. This is only called after the ydoc is synced to the server and if there is no
 * existing data in it. Any updates are done with clientID 0, so that if multiple clients set the
 * same content, there is no conflict.
 * **This must always be called with the same content on different clients otherwise the doc could
 * be inconsistent if two clients try to initialize different content concurrently.**
 * @example
 * ```js
 * firesync.subscribeYDoc('my-doc', {
 *   ydoc: new Y.Doc(),
 *   initialize: (ydoc) => {
 *     ydoc.getText('foo').insert(0, 'Initial content')
 *     ydoc.getMap('bar').set('hello', 'world')
 *   }
 * })
 * ```
 */
type SubscribeYDocOptions = {
  ydoc?: Y.Doc | null
  initialize?: (ydoc: Y.Doc) => void
}

/**
 * Options for firesync.subscribeAwareness
 * @typedef SubscribeAwarenessOptions
 * @type {object}
 * @param {Awareness=} [awareness] An optional existing Awareness instance to use rather than returning a new instance
 * @example
 * ```js
 * firesync.subscribeAwareness('my-doc', {
 *   awareness: new Awareness()
 * })
 * ```
 */
type SubscribeAwarenessOptions = { awareness?: Awareness }

/**
 * @typicalname firesync
 */
export class FireSync extends EventEmitter {
  /**
   * Create a new instance of a FireSync client. You will typically need one instance per client
   * in your application.
   *
   * @param {FireSyncOptions} options
   *
   * @example
   * ```js
   * import FireSync from '@firesync/client'
   * const firesync = new FireSync({
   *   // If using FireSync cloud:
   *   projectName: 'acme-dev',
   *   // Or if using a local firesync-server:
   *   // baseUrl: 'http://localhost:5000',
   *
   *   // A JWT token signed with your project secret
   *   token: 'my-token',
   *
   *   // Whether to connect to the server immediately
   *   connect: true
   * })
   * ```
   */
  constructor({
    baseUrl,
    projectName,
    connect = true,
    CustomWebSocket = WebSocket,
    token
  }: FireSyncOptions) {
    super()

    let url = baseUrl
    if (baseUrl === undefined && projectName !== undefined) {
      url = `https://${projectName}.firesync.live`
    }
    if (!url) {
      throw new Error(
        'Please configure FireSync with either a baseUrl or projectName parameter'
      )
    }

    this.docs = this.initDocs()
    this.connection = this.initConnection(url, token, CustomWebSocket)

    if (connect) {
      this.connect()
    }
  }

  /**
   * Attempt to connect to the server.
   *
   * The FireSync client will attempt to connect to the server when first initialized, although
   * this default behaviour can be overriden by passing `connect: false` when initializing.
   *
   * @example
   * ```js
   * const firesync = new FireSync({
   *   // ...
   *   connect: false
   * })
   * // Connect manually later
   * firesync.connect()
   * ```
   */
  connect() {
    this.connection.connect()
  }

  /**
   * Disconnect from the server.
   *
   * @example
   * ```js
   * firesync.disconnect()
   * ```
   */
  disconnect() {
    this.connection.disconnect()
  }

  /**
   * Returns true if the client is connected to the server, and false otherwise
   * @readonly
   * @returns {boolean}
   */
  get connected() {
    return this.connection.connected
  }

  /**
   * Subscribe to changes to the given document and return the
   * a Yjs [Y.Doc](/guides/yjs) which is kept in sync with the FireSync backend.
   *
   * Any changes made locally to the Y.Doc will be sent to other subscribed clients, and
   * the Y.Doc will received any changes made by other clients.
   *
   * If the doc has been previously unsubscribed then it will be resubscribed.
   *
   * @example
   * ```js
   * const doc = firesync.subscribeYDoc('foo')
   * doc.on('update', () => {
   *   // Will recieve local changes and changes from
   *   // other subscribed clients
   *   console.log('Doc was updated')
   * })
   * doc.getMap('user').set('name', 'Bob')
   * ```
   *
   * @param {string} docKey The key that identifies the document in the FireSync backend
   * @param {SubscribeYDocOptions} options
   * @returns {Y.Doc}
   */
  subscribeYDoc(
    docKey: string,
    { ydoc, initialize }: SubscribeYDocOptions = {}
  ) {
    const doc = this.docs.init(docKey, ydoc, initialize)

    // We might be re-subscribing to an existing unsubscribed doc
    doc.setWantToBeSubscribed()

    // Subscribe if we aren't already. We don't need to do anything if we're
    // UNSUBSCRIBING because handleUnsubscribeResponse checks if we want to be
    // subscribed and triggers sendSubscribeRequest if so
    if (doc.isUnsubscribed) {
      this.sendSubscribeRequestIfConnected(docKey)
    }

    return doc.ydoc
  }

  /**
   * Unsubscribe from the given document. The doc will no longer recieve changes made by other
   * clients or send changes made locally to the server.
   *
   * @example
   * ```js
   * firesync.unsubscribe('foo')
   * ```
   *
   * @param {string} docKey The key that identifies the document in the FireSync backend
   */
  unsubscribe(docKey: string) {
    const doc = this.docs.getOrError(docKey)

    if (doc.awareness) {
      removeAwarenessStates(doc.awareness, [doc.ydoc.clientID], 'unsubscribe')
    }

    doc.setWantToBeUnsubscribed()

    // Unsubscribe if we aren't already. We don't need to do anything if we're
    // SUBSCRIBING because handleSubscribeResponse checks if we want to be
    // unsubscribed and triggers sendUnsubscribeRequest if so
    if (doc.isSubscribed) {
      this.sendUnsubscribeRequest(docKey)
    }
  }

  // TODO: Turn these into internal only test methods
  isSubscribed(docKey: string) {
    return this.docs.get(docKey)?.isSubscribed
  }

  isSubscribing(docKey: string) {
    return this.docs.get(docKey)?.isSubscribing
  }

  isUnsubscribed(docKey: string) {
    return this.docs.get(docKey)?.isUnsubscribed
  }

  isUnsubscribing(docKey: string) {
    return this.docs.get(docKey)?.isUnsubscribing
  }

  hasSentInitialUpdate(docKey: string) {
    return this.docs.getOrError(docKey)?.sentInitialUpdate === true
  }

  /**
   * Returns an Awareness instance which is synced with the FireSync backend
   * and will send any awareness updates to other clients and receive awareness
   * updates from other clients.
   *
   * @param {string} docKey The key that identified the document in the FireSync backend
   * @param {Awareness} [awareness] An optional Awareness instance to use rather than returning a new instance
   * @returns {Awareness}
   */
  subscribeAwareness(
    docKey: string,
    { awareness }: SubscribeAwarenessOptions = {}
  ) {
    // Make sure we are subscribed
    this.subscribeYDoc(docKey)
    const doc = this.docs.get(docKey)
    if (!doc) {
      throw new UnexpectedInternalStateError(
        'Expected doc to have been inited when subscribed'
      )
    }
    return doc.initAwareness(awareness, this.awarenessUser)
  }

  private awarenessUser: AwarenessUser = {}

  setUserDisplayName(name: string) {
    this.awarenessUser.name = name
    this.docs.updateAwarenessUser(this.awarenessUser)
  }

  setUserColor(color: string) {
    this.awarenessUser.color = color
    this.docs.updateAwarenessUser(this.awarenessUser)
  }

  get stats() {
    return {
      connectsCount: this.connection.connectsCount,
      disconnectsCount: this.connection.disconnectsCount,
      nextConnectionAttemptTimeout:
        this.connection.nextConnectionAttemptTimeout,
      nextConnectionAttemptDelay: this.connection.nextConnectionAttemptDelay,
      maxConnectionAttemptDelay: this.connection.maxConnectionAttemptDelay,
      connectionAttempts: this.connection.connectionAttempts
    }
  }

  get token() {
    return this.connection.token
  }

  set token(token: string | undefined) {
    this.connection.token = token
  }

  connectionConfig({
    stopConnectionAttemptsAfter,
    maxConnectionAttemptDelay,
    minConnectionAttemptDelay,
    soonConnectionAttemptDelayThreshold
  }: {
    stopConnectionAttemptsAfter?: number
    maxConnectionAttemptDelay?: number
    minConnectionAttemptDelay?: number
    soonConnectionAttemptDelayThreshold?: number
  }) {
    if (stopConnectionAttemptsAfter !== undefined) {
      this.connection.stopConnectionAttemptsAfter = stopConnectionAttemptsAfter
    }
    if (maxConnectionAttemptDelay !== undefined) {
      this.connection.maxConnectionAttemptDelay = maxConnectionAttemptDelay
    }
    if (minConnectionAttemptDelay !== undefined) {
      this.connection.minConnectionAttemptDelay = minConnectionAttemptDelay
    }
    if (soonConnectionAttemptDelayThreshold !== undefined) {
      this.connection.soonConnectionAttemptDelayThreshold =
        soonConnectionAttemptDelayThreshold
    }
  }

  get __FOR_TESTING_ONLY_DO_NOT_USE() {
    return {
      send: this.connection.send.bind(this.connection),
      sendUpdate: this.sendUpdate.bind(this),
      sendStateVector: this.sendStateVector.bind(this)
    }
  }

  // Used for configuring options that are generally only useful for testing
  // and we definitely don't want to be different in real usage.
  // TODO: Move to internal only state
  chaosMonkey = {
    syncAfterSubscribe: true,
    ignoreUpdatesFromDocs: new Set<string>(),
    reconnectOnError: true
  }

  private docs: Docs
  private connection: Connection

  private initDocs() {
    const docs = new Docs()
    docs.on('update', (docKey, update, origin) => {
      if (!this.chaosMonkey.ignoreUpdatesFromDocs.has(docKey)) {
        try {
          this.handleYDocUpdate(docKey, update, origin)
        } catch (error) {
          if (error instanceof Error) {
            this.handleError(error)
          } else {
            throw error
          }
        }
      }
    })
    docs.on('awareness', (docKey, update, origin) => {
      try {
        this.handleLocalAwarenessUpdate(docKey, update, origin)
      } catch (error) {
        if (error instanceof Error) {
          this.handleError(error)
        } else {
          throw error
        }
      }
    })
    return docs
  }

  private initConnection(url: string, token?: string, CustomWebSocket?: any) {
    const connection = new Connection({
      url,
      token,
      CustomWebSocket
    })
    connection.on('beforeConnect', () => {
      this.docs.resetSubscriptionStates()
    })
    connection.on('open', () => {
      this.sendHandshakeRequest()
    })
    connection.on('message', (event) => {
      this.handleWebsocketMessage(event)
    })
    connection.on('error', (error) => {
      this.handleError(error)
    })
    connection.on('disconnect', () => {
      this.docs.resetSubscriptionStates()
      this.docs.removeAwarenessStates()
    })
    return connection
  }

  private handleYDocUpdate(docKey: string, update: Uint8Array, origin: any) {
    this.connection.recordActivity()
    if (this.connection.connected) {
      if (
        this.docs.getOrError(docKey).readyToSendUpdate &&
        // Don't send updates that originally came from the server
        origin !== FIRESYNC_SERVER_ORIGIN
      ) {
        this.sendUpdate(docKey, update)
      }
    } else {
      // We will do a full resync on reconnect, so don't need to
      // worry about dropping this update for now.
      // But do try to reconnect immediately if we've got new updates
      // to send
      if (this.connection.wantToBeConnected) {
        this.connection.reconnectWithDelay({ soon: true })
      }
    }
  }

  private handleLocalAwarenessUpdate(
    docKey: string,
    update: Uint8Array,
    origin: any
  ) {
    this.connection.recordActivity()
    if (this.connection.connected) {
      if (
        this.docs.getOrError(docKey).subscribed &&
        // Don't send updates that originally came from the server
        origin !== FIRESYNC_SERVER_ORIGIN
      ) {
        this.sendAwarenessUpdate(docKey, update)
      }
    } else {
      // We will do a full resync on reconnect, so don't need to
      // worry about dropping this update for now.
      // But do try to reconnect immediately if we've got new updates
      // to send
      if (this.connection.wantToBeConnected) {
        this.connection.reconnectWithDelay({ soon: true })
      }
    }
  }

  private handleWebsocketMessage(event: MessageEvent) {
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
      this.connection.recordActivity()
    }

    try {
      this.handleSyncMessage(message)
    } catch (error) {
      if (error instanceof Error) {
        this.handleError(error)
      } else {
        throw error
      }
    }
  }

  private handleError(error: Error) {
    if (error instanceof BadRequestError) {
      // Server sent something malformed that we didn't expect, so try
      // disconnecting and reconnecting
      if (this.chaosMonkey.reconnectOnError) {
        this.connection.reconnect()
      }
    }

    if (this.listenerCount('error') > 0) {
      this.emit('error', error)
    } else {
      console.error(
        "No registered listeners for error event, so logging error. Register a listener with connection.on('error') to avoid this."
      )
      console.error(error)
    }
  }

  // Sync Protocol
  private handleSyncMessage(message: Message) {
    switch (message.messageType) {
      case MessageType.HANDSHAKE_RESPONSE:
        this.handleHandshakeResponse(message)
        break
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
      case MessageType.AWARENESS_UPDATE:
        this.handleIncomingAwarenessUpdate(message)
        break
      default:
        this.handleError(
          new BadRequestError(`Unknown message type: ${message.messageType}`)
        )
    }
  }

  private sendHandshakeRequest() {
    this.connection.send(
      encodeMessage({
        messageType: MessageType.HANDSHAKE_REQUEST,
        protocolVersion: 1,
        userAgent: `@firesync/client@${LIB_VERSION}`
      })
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleHandshakeResponse(_message: HandshakeResponseMessage) {
    this.docs.keysToSubscribe.forEach((docKey) => {
      this.sendSubscribeRequest(docKey)
    })
  }

  private sendSubscribeRequest(docKey: string) {
    logger.debug('Sending subscription request', docKey)

    const doc = this.docs.getOrError(docKey)
    doc.setSubscribing()

    this.connection.send(
      encodeMessage({
        messageType: MessageType.SUBSCRIBE_REQUEST,
        docKey
      })
    )
  }

  private sendSubscribeRequestIfConnected(docKey: string) {
    if (this.connection.connected) {
      this.sendSubscribeRequest(docKey)
    }
  }

  private handleSubscribeResponse({
    docKey,
    sessionDocId
  }: SubscribeResponseMessage) {
    logger.debug('Received subscribe response', docKey, sessionDocId)

    const doc = this.docs.getOrError(docKey)
    doc.setSubscribed(sessionDocId)

    if (doc.wantToBeUnsubscribed) {
      // We might have been unsubscribed while we were subscribing
      this.sendUnsubscribeRequest(docKey)
    } else {
      // It's sometimes useful in testing to not do the initial state vector
      // sync so we can monitor it happening. This should always happen in
      // regular usage though.
      if (this.chaosMonkey.syncAfterSubscribe) {
        this.sendStateVector(docKey)
      }

      // Immediately send our awareness state
      doc.bumpAwareness()
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

  private sendUnsubscribeRequest(docKey: string) {
    logger.debug('Send unsubscribe request', {
      docKey
    })

    const doc = this.docs.getOrError(docKey)
    doc.setUnsubscribing()

    const sessionDocId = doc.getSessionDocIdOrError()

    logger.debug('Sending unsubscribe request', { docKey, sessionDocId })

    this.connection.send(
      encodeMessage({
        messageType: MessageType.UNSUBSCRIBE_REQUEST,
        sessionDocId
      })
    )
  }

  private handleUnsubscribeResponse({
    sessionDocId
  }: UnsubscribeResponseMessage) {
    logger.debug('Received unsubscribe response', sessionDocId)

    const doc = this.docs.getBySessionDocIdOrError(sessionDocId)
    doc.setUnsubscribed()

    if (doc.wantToBeSubscribed) {
      // We might have been unsubscribed while we were subscribing
      this.sendSubscribeRequest(doc.docKey)
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

  private sendStateVector(docKey: string) {
    logger.debug('Sending client state vector', docKey)

    const doc = this.docs.getOrError(docKey)
    const sessionDocId = doc.getSessionDocIdOrError()

    const sv = Y.encodeStateVector(doc.ydoc)

    this.connection.send(
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
    const doc = this.docs.getBySessionDocId(sessionDocId)
    if (doc === undefined) {
      // Doc has been unsubscribed while this was inflight
      return
    }
    const docKey = doc.docKey

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

  private _pendingUpdates = new Map<string, Uint8Array[]>()
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

  private sendUpdate(docKey: string, update: Uint8Array) {
    logger.debug('Sending update', docKey, () => Y.decodeUpdate(update))

    const doc = this.docs.getOrError(docKey)
    const sessionDocId = doc.getSessionDocIdOrError()

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
          return [sessionDocId, packUpdates(updates)]
        })
      )
      this._pendingUpdates = new Map()

      // updateId just needs to be unique for the UPDATE_ACK
      const updateId = this._updatesSentCount++
      this._inflightUpdateId = updateId

      this.connection.send(
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
      this.emit('updateAcked', updateId)
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
      const doc = this.docs.getBySessionDocId(sessionDocId)
      if (doc === undefined) {
        // Doc has been unsubscribed while this was inflight
        return
      }
      const docKey = doc.docKey

      logger.debug('Received server update', { docKey }, () =>
        Y.decodeUpdate(update)
      )

      Y.applyUpdate(doc.ydoc, update, FIRESYNC_SERVER_ORIGIN)

      this.emit('update', docKey, update)

      // Getting our first set of updates after sending the state
      // vector is our best indicator of being synced. Doing this
      // multiple times on future updates should be a no-op
      doc.setSynced()
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

  private sendAwarenessUpdate(docKey: string, update: Uint8Array) {
    logger.debug('sendAwarenessUpdate', {
      docKey
    })

    const doc = this.docs.getOrError(docKey)
    const sessionDocId = doc.getSessionDocIdOrError()

    this.connection.send(
      encodeMessage({
        messageType: MessageType.AWARENESS_UPDATE,
        sessionDocId,
        update
      })
    )
  }

  private handleIncomingAwarenessUpdate({
    update,
    sessionDocId
  }: AwarenessUpdateMessage) {
    const doc = this.docs.getBySessionDocId(sessionDocId)
    if (doc === undefined) {
      // Doc has been unsubscribed while this was inflight
      return
    }
    const docKey = doc.docKey

    if (doc.awareness !== undefined) {
      applyAwarenessUpdate(doc.awareness, update, FIRESYNC_SERVER_ORIGIN)
    }

    logger.debug('Received server awareness message', {
      docKey,
      state: Object.fromEntries(doc.awareness?.getStates() || new Map())
    })
  }
}
