import cors from 'cors'
import { requestHandler } from '../helpers/requestHandler'

export const setCorsHeadersForProject = requestHandler((req, res, next) => {
  const originsRaw = req.firesync.project.cors_allowed_origins || ''
  const origins = originsRaw.split('\n').map(simplePatternToRegex)
  return cors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['content-type', 'authorization']
  })(req, res, next)
})

export const simplePatternToRegex = (pattern: string) => {
  // Turn a pattern with '*' as wildcards into a proper regex
  // E.g. '*.example.com' -> /^.*\.example\.com$/
  return new RegExp(`^${pattern.split('*').map(escapeRegex).join('.*')}$`)
}

// https://stackoverflow.com/a/6969486
const escapeRegex = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
