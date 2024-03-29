import { Command, Flags } from '@oclif/core'

import { FiresyncServer } from '../../../server'

import { logging } from '../../../server/lib/Logging/Logger'
import { config, getProjectConfig } from '../../../config'

const logger = logging.child('cli')

export default class Server extends Command {
  static description = 'Run the firesync server'

  static flags = {
    host: Flags.string({
      char: 'h',
      summary: 'Host to bind to',
      env: 'FS_HOST',
      default: '0.0.0.0'
    }),

    port: Flags.integer({
      char: 'p',
      summary: 'Port to bind to',
      env: 'FS_PORT',
      default: 5000
    }),

    'debug-danger-do-not-use-in-production': Flags.boolean({
      summary: 'Enable debug router',
      env: 'FS_DEBUG_DANGER_DO_NOT_USE_IN_PRODUCTION',
      default: false
    })
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Server)

    const host = flags.host
    const port = flags.port
    const enableDebugRouter = flags['debug-danger-do-not-use-in-production']

    config.port = port
    config.host = host

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
