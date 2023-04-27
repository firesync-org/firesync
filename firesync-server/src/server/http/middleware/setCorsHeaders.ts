import cors from 'cors'
import { requestHandler } from '../helpers/requestHandler'
import models from '../../../server/models'
import { getProjectConfig } from '../../../config'
import { wildCardsToRegex } from '../../lib/wildCardsToRegex'

export const setCorsHeadersForProject = requestHandler(
  async (req, res, next) => {
    const project = await models.projects.getProjectFromRequest(req)
    const { corsAllowedOrigins } = await getProjectConfig(project.id)
    const origins = (corsAllowedOrigins || '')
      .split('\n')
      .map((origin: string) => wildCardsToRegex(origin))
    return cors({
      origin: origins,
      credentials: true,
      allowedHeaders: ['content-type', 'authorization']
    })(req, res, next)
  }
)
