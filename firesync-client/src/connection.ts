import EventEmitter from 'events'
import logging from './logging'
import {
  AuthError,
  BadParameterError,
  UnexpectedInternalStateError
} from './shared/errors'

const logger = logging('connection')

type Options = {
  url: string
  token?: string
  CustomWebSocket?: any
}

const SECONDS = 1000

export declare interface Connection {
  on(event: 'beforeConnect', listener: () => void): this
  on(event: 'open', listener: () => void): this
  on(event: 'message', listener: (event: MessageEvent) => void): this
  on(event: 'error', listener: (error: Error) => void): this
  on(event: 'disconnect', listener: () => void): this
}

export class Connection extends EventEmitter {
  private ws?: WebSocket | null
  private WebSocket: typeof WebSocket
  url: string
  token: string | undefined

  constructor({ url, token, CustomWebSocket = WebSocket }: Options) {
    super()
    this.url = url
    this.token = token
    this.WebSocket = CustomWebSocket
    if (!this.WebSocket) {
      throw new BadParameterError(
        'No global WebSocket found, please pass WebSocket constructor as option'
      )
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

    this.emit('beforeConnect')

    // http:// -> ws://, https:// -> wss://
    // TODO: What about // as a protocol?
    const url = `${this.url.replace(
      /^http/,
      'ws'
    )}?access_token=${encodeURIComponent(this.token || '')}`

    if (this.ws) {
      throw new UnexpectedInternalStateError(
        'Unexpectedly trying to create new WebSocket while existing socket is live'
      )
    }
    this.ws = new this.WebSocket(url)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = () => {
      this._connected = true
      this._connecting = false
      this._connectsCount++
      this.resetReconnectionAttempts()
      this.emit('open')
    }

    this.ws.onmessage = (event: MessageEvent) => {
      this.emit('message', event)
    }

    this.ws.onerror = (event) => {
      this._connected = false
      this._connecting = false
      const message =
        ((event as any).message as string | undefined) || 'Unexpected error'
      logger.log('ws.onerror', message)
      let error = new Error(message)
      if (message.match(/401/)) {
        error = new AuthError('Invalid Auth Credentials')
      }
      this.emit('error', error)
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

    this.emit('disconnect')

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

  reconnectWithDelay({ soon = false }: { soon?: boolean } = {}) {
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

  recordActivity() {
    this.lastActivityTimestamp = Date.now()
  }
}
