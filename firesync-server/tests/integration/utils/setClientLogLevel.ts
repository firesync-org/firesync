import { LogLevel, setLogLevel } from 'firesync-client'

const LEVELS = ['NONE', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as const
type Level = typeof LEVELS[number]

if (process.env.CLIENT_LOG_LEVEL) {
  const level = process.env.CLIENT_LOG_LEVEL
  if (LEVELS.includes(level as Level)) {
    setLogLevel(LogLevel[level as Level])
  } else {
    throw new Error(
      `Unexpected log level: ${level}. Value values are ${LEVELS}`
    )
  }
} else {
  setLogLevel(LogLevel.NONE)
}
