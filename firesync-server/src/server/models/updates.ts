import { logging } from '../lib/Logging/Logger'
import { db } from '../../db/db'
import { UnexpectedInternalStateError } from '../../shared/errors'

const logger = logging.child('model.updates')

export const updates = {
  async writeUpdate(
    docId: string,
    update: Uint8Array,
    newSv: Map<number, number>,
    txn = db.knex
  ) {
    logger.debug({ docId, update, newSv }, 'writeUpdate')

    const [row] = await txn('doc_updates')
      .insert({
        doc_id: docId.toString(),
        updates: Buffer.from(update),
        sv: Object.fromEntries(newSv)
      })
      .returning(['id'])

    if (row === undefined) {
      throw new UnexpectedInternalStateError(
        'Expected update to have been inserted'
      )
    }

    return row.id
  },

  async getStateVector(docId: string, txn = db.knex) {
    // TODO: Add packs/full svs and then only read back to the latest full sv

    const docUpdates = await txn('doc_updates')
      .where('doc_id', docId)
      .select('sv')

    const sv = docUpdates.reduce((accumulator, current) => {
      for (const [clientIdString, clock] of Object.entries(current.sv)) {
        const clientId = parseInt(clientIdString)
        const currentClock = accumulator.get(clientId) || 0
        accumulator.set(clientId, Math.max(currentClock, clock))
      }
      return accumulator
    }, new Map<number, number>())

    return sv
  },

  async getUpdates(docId: string, txn = db.knex) {
    // TODO: Filter by state vector to only query for the needed updates

    const docUpdates = await txn('doc_updates')
      .where('doc_id', docId)
      .select('updates')

    return docUpdates.map((du) => du.updates)
  },

  async getUpdateById(docId: string, updateId: string, txn = db.knex) {
    const docUpdate = await txn('doc_updates')
      .where('doc_id', docId)
      .where('id', updateId)
      .select('updates')
      .first()

    if (docUpdate === undefined) {
      throw new UnexpectedInternalStateError(
        `Expected update to exist: ${docId}:${updateId}`
      )
    }

    return docUpdate.updates
  }
}
