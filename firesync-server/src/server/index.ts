import express from 'express'
import expressLayouts from 'express-ejs-layouts'
import path from 'path'
import { getSessionParser } from './http/session'
import { rolesController } from './http/controllers/roles'
import { authController } from './http/controllers/auth'
import passport from 'passport'
import { loadProject } from './http/middleware/loadProject'
import { setCorsHeadersForProject } from './http/middleware/setCorsHeaders'
import { docsController } from './http/controllers/docs'
import { webSockets } from './ws/WebSockets'
import { Server } from 'net'
import { debugRouter } from './http/debug/debugRouter'
import { invitesController } from './http/controllers/invites'
import { projectsController } from './http/controllers/projects'
import { config } from '../config'

export { logging } from './lib/Logging/Logger'

type FiresyncServerOptions = {
  enableDebugRouter?: boolean
}

export const FiresyncServer = ({
  enableDebugRouter = false
}: FiresyncServerOptions = {}) => {
  const app = express()

  app.set('view engine', 'ejs')
  app.use(expressLayouts)
  app.set('views', path.join(__dirname, '../../views'))

  if (config.TRUST_PROXY) {
    // Needed for secure: true in cookie
    app.set('trust proxy', 1)
  }

  app.use(getSessionParser())
  app.use(express.json())

  app.use(passport.initialize())
  app.use(passport.session())

  app.use(loadProject)
  app.use(setCorsHeadersForProject)

  app.get('/status', (req, res) => {
    res.status(200).send()
  })

  app.get('/', projectsController.status)

  app.get('/user', authController.getUser)
  app.get('/auth/google', authController.authGoogle)
  app.get('/auth/google/callback', authController.authGoogleCallback)

  const apiRouter = express.Router()
  app.use('/api', apiRouter)
  apiRouter.post('/docs', docsController.createDoc)
  apiRouter.get('/docs/roles', rolesController.listDocRoles)
  apiRouter.get('/user/roles', rolesController.listUserRoles)

  apiRouter.post('/docs/invites', invitesController.createInvite)
  apiRouter.get(
    '/docs/invites/:token/redeem',
    invitesController.redeemInviteCsrfForm
  )
  apiRouter.post(
    '/docs/invites/:token/redeem',
    express.urlencoded({ extended: true }),
    invitesController.redeemInvite
  )

  if (enableDebugRouter) {
    app.use('/debug', debugRouter())
  }

  const listen = (host: string, port: number) => {
    return new Promise<Server>((resolve, reject) => {
      const server = app
        .listen(port, host, () => {
          resolve(server)
        })
        .on('error', (error) => reject(error))

      server.on('upgrade', webSockets.onUpgrade.bind(webSockets))
    })
  }

  return { listen }
}
