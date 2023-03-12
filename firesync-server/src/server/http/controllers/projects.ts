import models from '../../../server/models'
import { requestHandler } from '../helpers/requestHandler'

export const projectsController = {
  status: requestHandler(async (req, res) => {
    const project = await models.projects.getProjectFromRequest(req)
    res.render('projects/status', {
      projectName: project.name,
      layout: 'layout'
    })
  })
}
