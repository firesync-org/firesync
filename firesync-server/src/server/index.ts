import express from 'express'
import expressLayouts from 'express-ejs-layouts'
import path from 'path'
import { rolesController } from './http/controllers/roles'
import { googleAuthController } from './http/controllers/auth/google'
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
import { userController } from './http/controllers/user'
import { tokenController } from './http/controllers/tokens'

export { logging } from './lib/Logging/Logger'

type FiresyncServerOptions = {
  enableDebugRouter?: boolean
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      userId: string
    }
  }
}

passport.serializeUser(function (user, done) {
  done(null, user)
})

passport.deserializeUser(function (user: any, done) {
  done(null, user)
})

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

  app.use(express.json())

  app.use(passport.initialize())

  app.use(loadProject)
  app.use(setCorsHeadersForProject)

  app.get('/status', (req, res) => {
    res.status(200).send()
  })

  app.get('/', projectsController.status)

  app.get('/user', userController.getUser)

  app.post('/auth/tokens', tokenController.refreshAccessToken)
  app.post('/auth/tokens/revoke', tokenController.revokeTokens)

  app.get('/auth/google', googleAuthController.startAuth)
  app.get('/auth/google/callback', googleAuthController.callback)

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
