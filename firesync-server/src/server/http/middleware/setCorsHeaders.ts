import cors from 'cors'
import { requestHandler } from '../helpers/requestHandler'

export const setCorsHeadersForProject = requestHandler((req, res, next) => {
  const originsRaw = req.firesync.project.cors_allowed_origins || ''
  const origins = originsRaw.split('\n')
  return cors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['content-type']
  })(req, res, next)
})
