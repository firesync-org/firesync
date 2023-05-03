import {
  Awareness,
  encodeAwarenessUpdate,
  removeAwarenessStates
} from 'y-protocols/awareness'
import { Y } from './y'
import {
  BadParameterError,
  UnexpectedInternalStateError
} from './shared/errors'
import EventEmitter from 'events'
import { FIRESYNC_SERVER_ORIGIN } from './firesync'

enum SubscriptionStates {
  SUBSCRIBING,
  SUBSCRIBED,
  UNSUBSCRIBING,
  UNSUBSCRIBED
}

type AwarenessUpdate = {
  added: number[]
  removed: number[]
  updated: number[]
}

export declare interface Doc {
  on(event: 'subscribed', listener: (sessionDocId: string) => void): this
  on(event: 'unsubscribed', listener: (sessionDocId: string) => void): this
  on(
    event: 'awareness',
    listener: (update: Uint8Array, origin: any) => void
  ): this
}

export class Doc extends EventEmitter {
  docKey: string
  ydoc: Y.Doc
  awareness?: Awareness
  currentSubscriptionState: SubscriptionStates = SubscriptionStates.UNSUBSCRIBED
  desiredSubscriptionState: SubscriptionStates = SubscriptionStates.UNSUBSCRIBED
  sentInitialUpdate = false
  private sessionDocId?: string

  constructor(docKey: string, ydoc: Y.Doc) {
    super()
    this.docKey = docKey
    this.ydoc = ydoc
  }

  get readyToSendUpdate() {
    return (
      // Only send updates if we're subscribed. Otherwise, the update
      // will get synced during the initial sync after subscription
      this.subscribed &&
      // Only send updates after we've sent our initial batch of
      // pending updates during the initial sync. Otherwise we
      // might send an update that is later than one the server
      // doesn't have yet.
      this.sentInitialUpdate
    )
  }

  get subscribed() {
    return this.currentSubscriptionState === SubscriptionStates.SUBSCRIBED
  }

  getSessionDocIdOrError() {
    const sessionDocId = this.sessionDocId
    if (sessionDocId === undefined) {
      throw new BadParameterError(`Doc is not subscribed: ${this.docKey}`)
    }
    return sessionDocId
  }

  setSubscribed(sessionDocId: string) {
    this.currentSubscriptionState = SubscriptionStates.SUBSCRIBED
    this.sessionDocId = sessionDocId
    this.emit('subscribed', sessionDocId)
  }

  setSubscribing() {
    this.currentSubscriptionState = SubscriptionStates.SUBSCRIBING
  }

  setUnsubscribed() {
    this.currentSubscriptionState = SubscriptionStates.UNSUBSCRIBED
    this.sentInitialUpdate = false
    this.emit('unsubscribed', this.sessionDocId)
    delete this.sessionDocId
  }

  setUnsubscribing() {
    this.currentSubscriptionState = SubscriptionStates.UNSUBSCRIBING
  }

  get isSubscribed() {
    return this.currentSubscriptionState === SubscriptionStates.SUBSCRIBED
  }

  get isSubscribing() {
    return this.currentSubscriptionState === SubscriptionStates.SUBSCRIBING
  }

  get isUnsubscribed() {
    return this.currentSubscriptionState === SubscriptionStates.UNSUBSCRIBED
  }

  get isUnsubscribing() {
    return this.currentSubscriptionState === SubscriptionStates.UNSUBSCRIBING
  }

  setWantToBeSubscribed() {
    this.desiredSubscriptionState = SubscriptionStates.SUBSCRIBED
  }

  setWantToBeUnsubscribed() {
    this.desiredSubscriptionState = SubscriptionStates.UNSUBSCRIBED
  }

  get wantToBeSubscribed() {
    return this.desiredSubscriptionState === SubscriptionStates.SUBSCRIBED
  }

  get wantToBeUnsubscribed() {
    return this.desiredSubscriptionState === SubscriptionStates.UNSUBSCRIBED
  }

  initAwareness(awareness?: Awareness) {
    // Default to existing this.awareness if exists, otherwise
    // create new Awareness instance
    if (awareness === undefined) {
      if (this.awareness !== undefined) {
        awareness = this.awareness
      } else {
        awareness = new Awareness(this.ydoc)
      }
    }

    if (this.awareness === undefined) {
      this.awareness = awareness
      // Only set up event listener once, on the first time this.awarneess is set
      const _awareness = this.awareness // Cast to not undefined in callback for Typescript
      awareness.on(
        'update',
        ({ added, updated, removed }: AwarenessUpdate, origin: any) => {
          const changedClients = added.concat(updated).concat(removed)
          const update = encodeAwarenessUpdate(_awareness, changedClients)
          this.emit('awareness', update, origin)

          // If a new client connected, send them our awareness state
          if (
            // Update came from server
            origin === FIRESYNC_SERVER_ORIGIN &&
            // New client connected
            added.length > 0
          ) {
            this.bumpAwareness()
          }
        }
      )
      window?.addEventListener('beforeunload', () => {
        removeAwarenessStates(_awareness, [this.ydoc.clientID], 'window unload')
      })
    } else if (this.awareness !== awareness) {
      throw new Error(
        `Already subscribed to ${this.docKey} with an existing Awareness`
      )
    }

    return awareness
  }

  /**
   * Bump the local awareness clock to send our awareness state again without
   * any updates
   */
  bumpAwareness() {
    if (this.awareness) {
      this.awareness.setLocalState(this.awareness.getLocalState())
    }
  }
}

export declare interface Docs {
  on(
    event: 'update',
    listener: (docKey: string, update: Uint8Array, origin: any) => void
  ): this
  on(
    event: 'awareness',
    listener: (docKey: string, update: Uint8Array, origin: any) => void
  ): this
}

export class Docs extends EventEmitter {
  private docs: Map<string, Doc>

  // The client and server talk in session ids, which are short hands
  // for specific docs to avoid sending the entire doc name with each
  // small update. We get assigned a session id for each doc from the
  // server, and track the mapping here as in this.docs.sessionDocId
  private docKeysByDocIds: Record<string, string> = {}

  constructor() {
    super()
    this.docs = new Map()
  }

  getOrError(docKey: string) {
    const doc = this.get(docKey)
    if (doc === undefined) {
      throw new UnexpectedInternalStateError(`Doc does not exist: ${docKey}`)
    }
    return doc
  }

  get(docKey: string) {
    return this.docs.get(docKey)
  }

  getBySessionDocIdOrError(sessionDocId: string) {
    const docKey = this.docKeysByDocIds[sessionDocId]

    if (docKey === undefined) {
      throw new UnexpectedInternalStateError(
        `Doc does not exist: ${sessionDocId}`
      )
    }

    return this.getOrError(docKey)
  }

  getBySessionDocId(sessionDocId: string) {
    const docKey = this.docKeysByDocIds[sessionDocId]
    if (docKey === undefined) {
      return
    }
    // We should still error if the docKey doesn't exist, because
    // that means our internal state is inconsistent
    return this.getOrError(docKey)
  }

  /**
   * Set up a new Doc or return an existing one if present.
   * @param docKey The key that identified the document in the FireSync backend
   * @param ydoc An optional existing Y.Doc to use rather than creating a new instance
   */
  init(docKey: string, ydoc?: Y.Doc) {
    // Make sure we have a doc and that we aren't overwriting an
    // existing one
    let doc = this.docs.get(docKey)
    if (doc === undefined) {
      if (ydoc === undefined) {
        ydoc = new Y.Doc()
      }
      ydoc.on('update', (update: Uint8Array, origin: any) => {
        this.emit('update', docKey, update, origin)
      })

      doc = new Doc(docKey, ydoc)
      doc.on('subscribed', (sessionDocId) => {
        this.docKeysByDocIds[sessionDocId] = docKey
      })
      doc.on('unsubscribed', (sessionDocId) => {
        delete this.docKeysByDocIds[sessionDocId]
      })
      doc.on('awareness', (update, origin) => {
        this.emit('awareness', docKey, update, origin)
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

    return doc
  }

  resetSubscriptionStates() {
    this.docKeysByDocIds = {}
    this.docs.forEach((doc) => {
      doc.setUnsubscribed()
    })
  }

  removeAwarenessStates() {
    this.docs.forEach((doc) => {
      if (doc.awareness) {
        removeAwarenessStates(doc.awareness, [doc.ydoc.clientID], 'disconnect')
      }
    })
  }

  get keysToSubscribe() {
    return Array.from(this.docs.values())
      .filter((doc) => doc.wantToBeSubscribed)
      .map((doc) => doc.docKey)
  }
}
