import { logging } from '../Logging/Logger'
import { db } from '../../../db/db'
const logger = logging.child('postgresStorage')

export class PostgresStorage {
  async getDocId(projectId: string, docKey: string) {
    const doc = await db
      .knex('docs')
      .select('id')
      .where('project_id', projectId)
      .where('key', docKey)
      .first()
    return doc?.id
  }

  async writeUpdate(
    docId: string,
    update: Uint8Array,
    newSv: Map<number, number>
  ) {
    logger.debug({ docId, update, newSv }, 'writeUpdate')

    await db.knex('doc_updates').insert({
      doc_id: docId.toString(),
      updates: Buffer.from(update),
      sv: Object.fromEntries(newSv)
    })
  }

  async getStateVector(docId: string) {
    // TODO: Add packs/full svs and then only read back to the latest full sv

    const docUpdates = await db
      .knex('doc_updates')
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
  }

  async getUpdates(docId: string) {
    // TODO: Filter by state vector to only query for the needed updates

    const docUpdates = await db
      .knex('doc_updates')
      .where('doc_id', docId)
      .select('updates')

    return docUpdates.map((du) => du.updates)
  }
}
