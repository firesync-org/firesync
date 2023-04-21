import './lib/Logging/OpenTelemetry'
import express from 'express'
import expressLayouts from 'express-ejs-layouts'
import path from 'path'
import { setCorsHeadersForProject } from './http/middleware/setCorsHeaders'
import { webSockets } from './ws/WebSockets'
import { Server } from 'net'
import { debugRouter } from './http/debug/debugRouter'
import { config } from '../config'
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

  app.use((req, res, next) => {
    res.on('finish', function () {
      logger.info(
        {
          method: req.method,
          url: req.originalUrl,
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
