import bunyan from 'bunyan'
import * as Y from 'yjs'
import { svToString, updateToString } from '../../../shared/yUtils'

const updateSerializer = (
  update: Uint8Array | ReturnType<typeof Y.decodeUpdate>
) => updateToString(update)

const updatesSerializer = (
  updates: Array<Uint8Array | ReturnType<typeof Y.decodeUpdate>>
) => updates.map(updateSerializer)

const svSerializer = svToString

type LoggerInterface = {
  info: (obj: Record<string, any>, message: string) => void
  debug: (obj: Record<string, any>, message: string) => void
  warn: (obj: Record<string, any>, message: string) => void
  error: (obj: Record<string, any>, message: string) => void
  child: (moduleName: string) => LoggerInterface
}

class Logger implements LoggerInterface {
  logger: bunyan
  // eslint-disable-next-line no-use-before-define
  children: Logger[] = []

  constructor(logger?: bunyan, options: Record<string, any> = {}) {
    if (logger) {
      this.logger = logger.child(options)
    } else {
      this.logger = bunyan.createLogger({
        name: 'firesync-server',
        level: 'debug',
        service: { name: process.env.OTEL_SERVICE_NAME },
        serializers: {
          update: updateSerializer,
          updates: updatesSerializer,
          sv: svSerializer,
          updateInitialSv: svSerializer,
          updateFinalSv: svSerializer,
          serverSv: svSerializer,
          expectedSv: svSerializer,
          newSv: svSerializer,
          ...bunyan.stdSerializers,
          error: bunyan.stdSerializers.err
        }
      })
    }
  }

  level(level: bunyan.LogLevel) {
    this.logger.level(level)
    this.children.forEach((child) => child.level(level))
  }

  child(module: string) {
    const child = new Logger(this.logger, { module })
    this.children.push(child)
    return child
  }

  info(obj: Record<string, any>, message: string) {
    this.logger.info(obj, message)
  }

  debug(obj: Record<string, any>, message?: string) {
    // TODO: Lazy loading?
    this.logger.debug(obj, message)
  }

  warn(obj: Record<string, any>, message: string) {
    this.logger.warn(obj, message)
  }

  error(obj: Record<string, any>, message: string) {
    this.logger.error(obj, message)
  }
}

export const logging = new Logger()
