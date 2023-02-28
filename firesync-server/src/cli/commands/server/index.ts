import { Command, Flags } from '@oclif/core'

import { FiresyncServer } from '../../../server'

import { logging } from '../../../server/lib/Logging/Logger'
import { config } from '../../../config'

const logger = logging.child('cli')

export default class Server extends Command {
  static description = 'Run the firesync server'

  static flags = {
    host: Flags.string({
      char: 'h',
      summary: 'Host to bind to',
      env: 'HOST',
      default: 'localhost'
    }),

    port: Flags.integer({
      char: 'p',
      summary: 'Port to bind to',
      env: 'PORT',
      default: 5000
    }),

    'debug-router': Flags.boolean({
      summary: 'Enable debug router',
      env: 'FIRESYNC_ENABLE_DEBUG_ROUTER',
      default: false
    })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Server)

    const host = flags.host
    const port = flags.port
    const enableDebugRouter = flags['debug-router']

    config.PORT = port
    config.HOST = host

    const server = FiresyncServer({
      enableDebugRouter
    })
    const httpServer = await server.listen(host, port)
    logger.info({ host, port }, 'server started')

    // hold open the promise while the server is running so we
    // don't kill the knex connection with the cleanup hook
    return new Promise<void>((resolve) => {
      httpServer.on('close', resolve)
    })
  }
}
