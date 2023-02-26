import { requestHandler } from '../helpers/requestHandler'

export const projectsController = {
  status: requestHandler(async (req, res) => {
    const project = req.firesync.project
    res.render('projects/status', {
      projectName: project.name,
      layout: 'layout'
    })
  })
}
