import { requestHandler } from '../helpers/requestHandler'
import { projects } from '../../models/projects'

export const loadProject = requestHandler(async (req, res, next) => {
  const project = await projects.getProjectFromRequest(req)

  req.firesync = {
    project
  }

  next()
})
