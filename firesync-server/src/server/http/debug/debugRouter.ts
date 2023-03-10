import express from 'express'
import { requestHandler } from '../helpers/requestHandler'
import { db } from '../../../db/db'
import { UnexpectedInternalStateError } from '../../../shared/errors'
import { docStore } from '../../lib/Docs/DocStore'
import { storage } from '../../lib/Storage'
import { webSockets } from '../../ws/WebSockets'

export const debugRouter = () => {
  const debugRouter = express.Router()

  // Create test user and log them in
  debugRouter.post(
    '/user',
    requestHandler(async (req, res) => {
      const projectId = req.firesync.project.id

      const [newProjectUser] = await db
        .knex('project_users')
        .insert({ project_id: projectId }, ['id'])

      if (newProjectUser === undefined) {
        throw new UnexpectedInternalStateError('user not created')
      }

      const userId = newProjectUser.id
      req.login({ userId }, () => {
        res.json({ userId })
      })
    })
  )

  debugRouter.get(
    '/docs/:docKey/sv',
    requestHandler(async (req, res) => {
      const docId = await docStore.getDocId(
        req.firesync.project.id,
        req.params.docKey!
      )
      if (docId === undefined) {
        return res.status(404).send(`Doc does not exist`)
      }

      const stateVector = await docStore.getStateVector(docId)
      res.json({
        sv: Object.fromEntries(stateVector)
      })
    })
  )

  debugRouter.get(
    '/docs/:docKey/updates',
    requestHandler(async (req, res) => {
      const docId = await docStore.getDocId(
        req.firesync.project.id,
        req.params.docKey!
      )
      if (docId === undefined) {
        return res.status(404).send(`Doc does not exist`)
      }
      res.json({
        updates: (await storage.getUpdates(docId)).map((buffer) =>
          Array.from(buffer)
        )
      })
    })
  )

  debugRouter.get('/connections', (req, res) => {
    res.json({
      connections: webSockets.getConnectionCounts()
    })
  })

  debugRouter.post(
    '/docs/:docKey/connections/terminate',
    requestHandler(async (req, res) => {
      const docId = await docStore.getDocId(
        req.firesync.project.id,
        req.params.docKey!
      )
      if (docId === undefined) {
        return res.status(404).send(`Doc does not exist`)
      }
      await webSockets.terminateDocConnections(docId)
      res.send('OK')
    })
  )

  debugRouter.post('/connections/refuse', async (req, res) => {
    webSockets.chaosMonkey.refuseConnections = true
    res.send('OK')
  })

  debugRouter.post('/connections/accept', async (req, res) => {
    webSockets.chaosMonkey.refuseConnections = false
    res.send('OK')
  })

  return debugRouter
}
