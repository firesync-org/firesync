import { logging } from '../lib/Logging/Logger'
import { db } from '../../db/db'
import { UnexpectedInternalStateError } from '../../shared/errors'
import { encodeUpdate, packUpdates } from '../../shared/yUtils'
import { config } from '../../config'
import { Y } from '../../y'

const logger = logging.child('model.updates')

export const updates = {
  async writeUpdate(
    docId: string,
    update: Uint8Array,
    newSv: Map<number, number>,
    txn = db.knex
  ) {
    logger.debug({ docId, update, newSv }, 'writeUpdate')

    const { structs, ds } = Y.decodeUpdate(update)

    const [row] = await txn('doc_updates')
      .insert({
        doc_id: docId.toString(),
        structs: Buffer.from(
          encodeUpdate({ structs, ds: { clients: new Map() } })
        ),
        ds: Buffer.from(encodeUpdate({ structs: [], ds })),
        sv: Buffer.from(Y.encodeStateVector(newSv))
      })
      .returning(['id'])

    if (row === undefined) {
      throw new UnexpectedInternalStateError(
        'Expected update to have been inserted'
      )
    }

    const tryPackEveryNUpdates = config.packAfterNUpdates / 3
    // We evaluate true on average 1 in every tryPackEveryNUpdates times
    if (Math.random() < 1 / tryPackEveryNUpdates) {
      // Don't wait, just try in background
      this.tryPackUpdates(docId)
    }

    return row.id
  },

  async getStateVector(docId: string, txn = db.knex) {
    const docUpdates = await txn('doc_updates')
      .where('doc_id', docId)
      .select('sv')

    const sv = mergeSvs(docUpdates.map((update) => update.sv))

    return sv
  },

  /**
   * Returns the updates for the a doc, optionally filtered to only those with content later than the given state vector
   * @param docId The docId to get updates for
   * @param sv An optional state vector. If provided, updates which are less than or equal to this state vector are not returned
   * @param txn An optional ongoing knex transaction
   * @returns An array of binary encoded updates
   */
  async getUpdates(
    docId: string,
    sv: Map<number, number> = new Map(),
    txn = db.knex
  ) {
    let updateRows
    if (sv.size === 0) {
      // A common path is to get all updates, so don't do anything clever
      updateRows = await txn('doc_updates')
        .select('structs', 'ds')
        .where('doc_id', docId)
        .orderBy('pack_last_update_inserted_at')
      return updateRows.map((update) =>
        Y.mergeUpdates([update.structs, update.ds])
      )
    } else {
      // To avoid fetching unnecessary update content we first check just the state vectors,
      // then return only the updates that are later than the given state vector. For clients
      // that are only partially out of sync, this avoids loading the content of older large
      // packs.
      return await txn.transaction(async (txn) => {
        // Wait for a transaction level shared lock for the document, so that
        // we don't do our two reads while a pack is going on that might delete
        // the updates we just read. A shared lock is fine because we're only reading here.
        await txn.raw(
          'select pg_advisory_xact_lock_shared(:docId::bigint) as lock',
          { docId }
        )

        const allUpdatesPartial = await txn('doc_updates')
          .select('id', 'sv', 'ds')
          .where('doc_id', docId)

        const neededUpdates = allUpdatesPartial.filter((update) => {
          const updateSv = Y.decodeStateVector(update.sv)
          for (const [client, updateClock] of updateSv.entries()) {
            const requestedClock = sv.get(client)
            if (requestedClock === undefined) {
              // Requesting client doesn't know about this update at all so return it
              return true
            } else {
              // If our update clock is greater than the state vector, we need to return it
              // Alternatively, if it's less than or equal, then this update is already included
              // in the state that the state vector represents, so the requesting client doesn't
              // need it.
              if (updateClock > requestedClock) {
                return true
              }
            }
          }
          return false
        })

        const updatesWithStructs = await txn('doc_updates')
          .select('structs')
          .where('doc_id', docId)
          .whereIn(
            'id',
            neededUpdates.map((u) => u.id)
          )
          .orderBy('pack_last_update_inserted_at')

        return allUpdatesPartial
          .map((update) => update.ds)
          .concat(updatesWithStructs.map((update) => update.structs))
      })
    }
  },

  async getUpdateById(docId: string, updateId: string, txn = db.knex) {
    const docUpdate = await txn('doc_updates')
      .where('doc_id', docId)
      .where('id', updateId)
      .select('structs', 'ds')
      .first()

    if (docUpdate === undefined) {
      throw new UnexpectedInternalStateError(
        `Expected update to exist: ${docId}:${updateId}`
      )
    }

    return Y.mergeUpdates([docUpdate.structs, docUpdate.ds])
  },

  async tryPackUpdates(docId: string, txn = db.knex) {
    const PACK_LEVELS = [1, 2, 3, 4].map(() => ({
      maxCount: config.packAfterNUpdates
    }))

    const packedLevels: Array<{
      level: number
      count: number
    }> = []

    await txn.transaction(async (txn) => {
      // Try to acquire a transaction level lock.
      // It is automatically released by postgres at the end of this transaction.
      // It doesn't block if it's already taken, but instead returns true or false.
      const lockResult = await txn.raw(
        'select pg_try_advisory_xact_lock(:docId::bigint) as lock',
        { docId }
      )
      const gotLock = !!lockResult.rows[0].lock
      if (!gotLock) {
        // Either:
        // * Another process is doing some packing, in which case the packing will still happen; or
        // * A read is happening via getUpdates. Packing won't happen this time but it gets retried
        //   regularly as new updates come in.
        return
      }

      for (const [level, { maxCount }] of PACK_LEVELS.entries()) {
        // Don't pack recent updates because they still need to be looked up by other
        // nodes to send the update to connected clients
        const packUpToDate = new Date(
          Date.now() - config.waitSecondsBeforePacking * 1000
        )
        const updates = await txn('doc_updates')
          .select(['id', 'size'])
          .where('doc_id', docId)
          .where('pack_level', level)
          .where('inserted_at', '<', packUpToDate.toISOString())

        logger.debug(
          { updateCount: updates.length, packUpToDate },
          'updates to pack'
        )

        if (updates.length > maxCount) {
          // Pack Updates
          const updateIds = updates.map((u) => u.id)
          const originalUpdates = await txn('doc_updates')
            .select('structs', 'ds', 'sv', 'inserted_at')
            .whereIn('id', updateIds)
          const packedYUpdate = packUpdates(
            originalUpdates
              .map((u) => u.structs)
              .concat(originalUpdates.map((u) => u.ds))
          )
          const { structs: packedStructs, ds: packedDs } =
            Y.decodeUpdate(packedYUpdate)
          const packedSv = mergeSvs(originalUpdates.map((update) => update.sv))
          const maxInsertedAt = originalUpdates
            .map((u) => u.inserted_at)
            .reduce(function (a, b) {
              return a > b ? a : b
            })

          await txn('doc_updates').insert({
            doc_id: docId,
            structs: Buffer.from(
              encodeUpdate({
                structs: packedStructs,
                ds: { clients: new Map() }
              })
            ),
            ds: Buffer.from(encodeUpdate({ structs: [], ds: packedDs })),
            sv: Buffer.from(Y.encodeStateVector(packedSv)),
            pack_level: level + 1,
            pack_last_update_inserted_at: maxInsertedAt
          })
          await txn('doc_updates').delete().whereIn('id', updateIds)
          packedLevels.push({ level, count: updates.length })
        } else {
          // Don't try to pack higher levels if we didn't pack the lower level
          break
        }
      }

      logger.debug({ docId, packedLevels }, 'packUpdates')
    })
  }
}

function mergeSvs(svs: Buffer[]) {
  return svs.reduce((accumulator, current) => {
    const sv = Y.decodeStateVector(current)
    for (const [clientId, clock] of sv.entries()) {
      const currentClock = accumulator.get(clientId) || 0
      accumulator.set(clientId, Math.max(currentClock, clock))
    }
    return accumulator
  }, new Map<number, number>())
}
