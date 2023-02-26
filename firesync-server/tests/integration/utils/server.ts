import bunyan from 'bunyan'
import { FiresyncServer, logging } from '../../../src/server'
import { Server } from 'node:net'

logging.level((process.env.SERVER_LOG_LEVEL as bunyan.LogLevel) || 'fatal')

export class TestServer {
  port: number
  server?: Server

  constructor(port = 5000) {
    this.port = port
  }

  async start() {
    this.server = await FiresyncServer().listen('localhost', this.port)
  }

  stop() {
    return new Promise<void>((resolve) => {
      if (!this.server) {
        resolve()
      } else {
        this.server.close(() => {
          resolve()
        })
      }
    })
  }
}
