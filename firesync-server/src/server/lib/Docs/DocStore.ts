import * as Y from 'yjs'
import createSubscriber, { Subscriber } from 'pg-listen'

import {
  filterUpdates,
  getFinalStateOfUpdate,
  getInitialStateOfUpdate
} from './updates'
import models from '../../models'
import EventEmitter from 'events'
import { logging } from '../Logging/Logger'
import { BadRequestError } from '../../../shared/errors'
import { config } from '../../../config'

const logger = logging.child('docStore')

declare interface DocStore {
  on(
    event: 'error',
    listener: (docId: string, error: Error, source: string) => void
  ): this
  on(
    event: 'update',
    listener: (docId: string, dbUpdateId: string, source: string) => void
  ): this
}

const docChannelName = (docId: string) => `doc_updates:${docId}`

class DocStore extends EventEmitter {
  subscriber: Subscriber

  constructor() {
    super()
    this.subscriber = createSubscriber(config.postgres)
  }

  async subscribe(docId: string) {
    await this.doStateChange(docId, async () => {
      if (!this.isSubscribed(docId)) {
        this.subscriber.notifications.on(
          docChannelName(docId),
          async ({
            dbUpdateId,
            source
          }: {
            dbUpdateId: string
            source: string
          }) => {
            logger.debug(
              { dbUpdateId, source, docId },
              'got notify message for doc'
            )
            this.emit('update', docId, dbUpdateId, source)
          }
        )
        await this.subscriber.listenTo(docChannelName(docId))
      }
    })
  }

  private isSubscribed(docId: string) {
    return this.subscriber
      .getSubscribedChannels()
      .includes(docChannelName(docId))
  }

  async unsubscribe(docId: string) {
    await this.doStateChange(docId, async () => {
      this.subscriber.notifications.removeAllListeners(docChannelName(docId))
      await this.subscriber.unlisten(docChannelName(docId))
    })
  }

  // Use pending state change queue so that we don't have concurrency issues with
  // subscribing and unsubscribing at the same time.
  private pendingConnect: Promise<void> | null = null
  private pendingDocStateChanges = new Map<string, Promise<void>>()

  private async connectSubscriber() {
    if (this.pendingConnect === null) {
      this.pendingConnect = this.subscriber.connect()
    }
    await this.pendingConnect
  }

  private async waitForPendingStateChange(docId: string) {
    await this.connectSubscriber()
    const pendingStateChange = this.pendingDocStateChanges.get(docId)
    if (pendingStateChange) {
      await pendingStateChange
    }
  }

  private async doStateChange(docId: string, stateChange: () => Promise<void>) {
    await this.waitForPendingStateChange(docId)
    const promise = stateChange()
    this.pendingDocStateChanges.set(docId, promise)
    await promise
  }

  async applyUpdate(docId: string, update: Uint8Array, source: string) {
    logger.debug(
      {
        docId,
        update: Y.decodeUpdate(update),
        source
      },
      'applyUpdate'
    )

    // serverSv may be stale if more updates have come in since
    // reading it. However, at worst we will end up with some
    // duplicate updates that should have been filtered but aren't.
    // These will get removed when the updates are merged.
    const serverSv = await this.getStateVector(docId)
    const filteredUpdate = filterUpdates([update], serverSv)

    logger.debug(
      {
        docId,
        filteredUpdate: Y.decodeUpdate(filteredUpdate),
        source
      },
      'filteredUpdate'
    )

    const updateInitialSv = getInitialStateOfUpdate(update)
    const updateFinalSv = getFinalStateOfUpdate(update)

    let dbUpdateId: string
    try {
      // Check that we don't have any gaps between the current state vector
      // and the updates being applied
      updateInitialSv.forEach((expectedClock, client) => {
        const currentClock = serverSv.get(client) || 0
        if (expectedClock > currentClock) {
          throw new BadRequestError(
            `Update cannot apply to current state vector: Expected: ${client} clock to be ${expectedClock} but was ${currentClock}`
          )
        }
      })
      dbUpdateId = await models.updates.writeUpdate(
        docId,
        filteredUpdate,
        updateFinalSv
      )
    } catch (error) {
      this.emit('error', docId, error, source)
      return
    }

    this.subscriber.notify(docChannelName(docId), { dbUpdateId, source })
  }

  async getStateVector(docId: string) {
    const sv = await models.updates.getStateVector(docId)
    logger.debug({ docId, sv }, 'getStateVector')
    return sv
  }

  async getStateAsUpdate(docId: string, sv: Uint8Array) {
    const updates = await models.updates.getUpdates(docId)
    const update = filterUpdates(updates, Y.decodeStateVector(sv))
    logger.debug({ docId, sv, update }, 'getStateAsUpdates')

    // TODO: We get lots of small updates back from pg here.
    // Do we want to merge them before sending to the client?
    // Do we want to do this before or after filtering them?
    return update
  }
}

export const docStore = new DocStore()
