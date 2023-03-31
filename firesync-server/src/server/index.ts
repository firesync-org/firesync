import './lib/Logging/OpenTelemetry'
import express from 'express'
import expressLayouts from 'express-ejs-layouts'
import path from 'path'
import { rolesController } from './http/controllers/roles'
import { googleAuthController } from './http/controllers/auth/google'
import passport from 'passport'
import { setCorsHeadersForProject } from './http/middleware/setCorsHeaders'
import { docsController } from './http/controllers/docs'
import { webSockets } from './ws/WebSockets'
import { Server } from 'net'
import { debugRouter } from './http/debug/debugRouter'
import { invitesController } from './http/controllers/invites'
import { config } from '../config'
import { userController } from './http/controllers/user'
import { tokenController } from './http/controllers/tokens'
import { logging } from './lib/Logging/Logger'
import { errorHandler } from './http/middleware/errorHandler'

export { logging } from './lib/Logging/Logger'

const logger = logging.child('server')

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

  if (config.trustProxy) {
    // Needed for secure: true in cookie
    app.set('trust proxy', 1)
  }

  app.use(express.json())

  app.use(passport.initialize())

  app.use((req, res, next) => {
    res.on('finish', function () {
      logger.info(
        {
          method: req.method,
          url: decodeURI(req.originalUrl),
          statusCode: res.statusCode,
          statusMessage: res.statusMessage
        },
        'http request'
      )
    })
    next()
  })

  app.use(setCorsHeadersForProject)

  app.get('/status', (req, res) => {
    res.status(200).send()
  })

  app.get('/', (req, res) => res.render('index'))

  app.get('/setup/google_auth', (req, res) => res.render('setup/googleAuth'))
  app.get('/setup/google_auth_success_redirect_url', (req, res) =>
    res.render('setup/googleAuthSuccessRedirectUrl')
  )
  app.get('/setup/redeem_invite_url', (req, res) =>
    res.render('setup/redeemInviteUrl')
  )

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
  apiRouter.post('/docs/invites/:token/redeem', invitesController.redeemInvite)

  if (enableDebugRouter) {
    app.use('/debug', debugRouter())
  }

  app.use(errorHandler)

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
