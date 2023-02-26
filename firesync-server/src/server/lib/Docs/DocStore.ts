import * as Y from 'yjs'

import {
  filterUpdates,
  getFinalStateOfUpdate,
  getInitialStateOfUpdate
} from './updates'
import { storage } from '../Storage'
import EventEmitter from 'events'
import { logging } from '../Logging/Logger'
import { BadRequestError } from '../../../shared/errors'
const logger = logging.child('docStore')

declare interface DocStore {
  on(
    event: 'error',
    listener: (docId: number, error: Error, source: string) => void
  ): this
  on(
    event: 'update',
    listener: (docId: number, update: Uint8Array, source: string) => void
  ): this
}

class DocStore extends EventEmitter {
  async getDocId(projectId: string, docKey: string) {
    return await storage.getDocId(projectId, docKey)
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
      await storage.writeUpdate(docId, filteredUpdate, updateFinalSv)
    } catch (error) {
      this.emit('error', docId, error, source)
      return
    }

    this.emit('update', docId, update, source)
  }

  async getStateVector(docId: string) {
    const sv = await storage.getStateVector(docId)
    logger.debug({ docId, sv }, 'getStateVector')
    return sv
  }

  async getStateAsUpdate(docId: string, sv: Uint8Array) {
    const updates = await storage.getUpdates(docId)
    const update = filterUpdates(updates, Y.decodeStateVector(sv))
    logger.debug({ docId, sv, update }, 'getStateAsUpdates')

    // TODO: We get lots of small updates back from redis here.
    // Do we want to merge them before sending to the client?
    // Do we want to do this before or after filtering them?
    return update
  }
}

export const docStore = new DocStore()
