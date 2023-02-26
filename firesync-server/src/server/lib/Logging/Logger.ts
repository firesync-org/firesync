import bunyan from 'bunyan'
import * as Y from 'yjs'

const updateSerializer = (
  update: Uint8Array | ReturnType<typeof Y.decodeUpdate>
) => {
  if (update instanceof Uint8Array) {
    update = Y.decodeUpdate(update)
  }
  return {
    structs: update.structs.map((struct) => {
      return {
        clientId: struct.id.client,
        clock: struct.id.clock,
        content:
          struct instanceof Y.Item
            ? struct.content instanceof Y.ContentString
              ? struct.content.str
              : null
            : null,
        len: struct.length
      }
    }),
    ds: update.ds
  }
}

const updatesSerializer = (
  updates: Array<Uint8Array | ReturnType<typeof Y.decodeUpdate>>
) => updates.map(updateSerializer)

const svSerializer = (sv: Uint8Array | Map<number, number>) => {
  if (sv instanceof Uint8Array) {
    sv = Y.decodeStateVector(sv)
  }
  return Object.fromEntries(sv)
}

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
        name: 'server',
        level: 'debug',
        serializers: {
          update: updateSerializer,
          updates: updatesSerializer,
          sv: svSerializer,
          updateInitialSv: svSerializer,
          updateFinalSv: svSerializer,
          serverSv: svSerializer,
          expectedSv: svSerializer,
          newSv: svSerializer
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
