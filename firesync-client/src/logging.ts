import { Y } from './y'

export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

let LOG_LEVEL = LogLevel.DEBUG

export const setLogLevel = (logLevel: LogLevel) => {
  LOG_LEVEL = logLevel
}

const logging = (scope: string) => {
  return {
    log: (...args: any[]) => {
      if (LOG_LEVEL < LogLevel.INFO) return
      console.log(`[${scope}]`, ...args)
    },
    debug: (...args: any[]) => {
      if (LOG_LEVEL < LogLevel.DEBUG) return
      // Allow passing in functions, so that we can lazy
      // load debugging info for performance reasons
      // since most debug log data isn't used in production
      args = args.map((a) => (a instanceof Function ? a() : a))

      console.log(`[${scope}]`, ...args)
    },
    warn: (...args: any[]) => {
      if (LOG_LEVEL < LogLevel.WARN) return
      console.warn('[WARNING]', `[${scope}]`, ...args)
    },
    error: (...args: any[]) => {
      if (LOG_LEVEL < LogLevel.ERROR) return
      console.error('[ERROR]', `[${scope}]`, ...args)
    }
  }
}

logging.decodeUpdate = (update: Uint8Array) => Y.decodeUpdate(update)

export default logging
