import { Hook } from '@oclif/core'
import { db } from '../../../db/db'

const hook: Hook<'postrun'> = async function () {
  // Disconnect from the database so we can have a clean exit
  await db.knex.destroy()
}

export default hook
