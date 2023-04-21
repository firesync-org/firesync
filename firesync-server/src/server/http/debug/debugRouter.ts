import express from 'express'
import { requestHandler } from '../helpers/requestHandler'
import { docStore } from '../../lib/Docs/DocStore'
import { webSockets } from '../../ws/WebSockets'
import models from '../../../server/models'
import { config } from '../../../config'

export const debugRouter = () => {
  const debugRouter = express.Router()

  debugRouter.get(
    '/docs/:docKey/sv',
    requestHandler(async (req, res) => {
      const project = await models.projects.getProjectFromRequest(req)
      const docKey = req.params.docKey!
      const docId = await models.docs.getOrCreateDocId(project.id, docKey)

      const stateVector = await docStore.getStateVector(docId)
      res.json({
        sv: Object.fromEntries(stateVector)
      })
    })
  )

  debugRouter.get(
    '/docs/:docKey/updates',
    requestHandler(async (req, res) => {
      const project = await models.projects.getProjectFromRequest(req)
      const docKey = req.params.docKey!
      const docId = await models.docs.getOrCreateDocId(project.id, docKey)
      const updates = await models.updates.getUpdates(docId)

      res.json({
        updates: updates.map((update) => Array.from(update))
      })
    })
  )

  debugRouter.get('/connections', (req, res) => {
    res.json({
      connections: webSockets.getConnectionCounts()
    })
  })

  debugRouter.post(
    '/docs/:docKey/updates/pack',
    requestHandler(async (req, res) => {
      const project = await models.projects.getProjectFromRequest(req)
      const docKey = req.params.docKey!
      const docId = await models.docs.getOrCreateDocId(project.id, docKey)

      await models.updates.tryPackUpdates(docId)
      res.send('OK')
    })
  )

  debugRouter.post(
    '/docs/:docKey/connections/terminate',
    requestHandler(async (req, res) => {
      const project = await models.projects.getProjectFromRequest(req)
      const docKey = req.params.docKey!
      const docId = await models.docs.getOrCreateDocId(project.id, docKey)

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

  debugRouter.post('/config', async (req, res) => {
    const packAfterNUpdates = req.body.packAfterNUpdates
    if (typeof packAfterNUpdates === 'number') {
      config.packAfterNUpdates = packAfterNUpdates
    }
    const waitSecondsBeforePacking = req.body.waitSecondsBeforePacking
    if (typeof waitSecondsBeforePacking === 'number') {
      config.waitSecondsBeforePacking = waitSecondsBeforePacking
    }
    const jwtAuthSecrets = req.body.jwtAuthSecrets
    if (jwtAuthSecrets) {
      config.jwtAuthSecrets = jwtAuthSecrets
    }
    res.send('OK')
  })

  return debugRouter
}
