import express from 'express'
import { requestHandler } from '../helpers/requestHandler'
import { db } from '../../../db/db'
import { UnexpectedInternalStateError } from '../../../shared/errors'
import { docStore } from '../../lib/Docs/DocStore'
import { storage } from '../../lib/Storage'
import { webSockets } from '../../ws/WebSockets'
import { tokens } from '../../models/tokens'
import { BadRequestHttpError } from '../helpers/errors'
import models from '../../../server/models'
import { isRole } from '../../../shared/roles'

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

      const { refreshToken, accessToken, expiresInSeconds } =
        await tokens.generateTokens(userId)

      res.json({ refreshToken, accessToken, expiresInSeconds, userId })
    })
  )

  debugRouter.post(
    '/tokens/expire',
    requestHandler(async (req, res) => {
      const refreshToken = req.body.refresh_token
      if (typeof refreshToken === 'string') {
        await db
          .knex('refresh_tokens')
          .update({
            expires_at: new Date().toISOString()
          })
          .where('token', refreshToken)
      }

      const accessToken = req.body.access_token
      if (typeof accessToken === 'string') {
        await db
          .knex('access_tokens')
          .update({
            expires_at: new Date().toISOString()
          })
          .where('token', accessToken)
      }

      res.json({})
    })
  )

  debugRouter.post(
    '/invites/:token/expire',
    requestHandler(async (req, res) => {
      const token = req.params.token
      if (typeof token === 'string') {
        await db
          .knex('invite_tokens')
          .update({
            expires_at: new Date().toISOString()
          })
          .where('token', token)
      }

      res.json({})
    })
  )

  debugRouter.post(
    '/docs/:docKey/roles',
    requestHandler(async (req, res) => {
      const docKey = req.params.docKey!
      const docId = await models.docs.getDocIdWithoutAuth(
        req.firesync.project,
        docKey
      )

      const userId = req.body.userId
      if (typeof userId !== 'string') {
        throw new BadRequestHttpError('Expected userId')
      }

      const role = req.body.role
      if (typeof role !== 'string' || !isRole(role)) {
        throw new BadRequestHttpError('Expected role')
      }

      models.roles.setRole(docId, userId, role)

      res.json({})
    })
  )

  debugRouter.get(
    '/docs/:docKey/sv',
    requestHandler(async (req, res) => {
      const docKey = req.params.docKey!
      const docId = await models.docs.getDocIdWithoutAuth(
        req.firesync.project,
        docKey
      )

      const stateVector = await docStore.getStateVector(docId)
      res.json({
        sv: Object.fromEntries(stateVector)
      })
    })
  )

  debugRouter.get(
    '/docs/:docKey/updates',
    requestHandler(async (req, res) => {
      const docKey = req.params.docKey!
      const docId = await models.docs.getDocIdWithoutAuth(
        req.firesync.project,
        docKey
      )

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
      const docKey = req.params.docKey!
      const docId = await models.docs.getDocIdWithoutAuth(
        req.firesync.project,
        docKey
      )

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
