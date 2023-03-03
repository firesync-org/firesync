import { requestHandler } from '../helpers/requestHandler'
import { tokens } from '../../models/tokens'

export const userController = {
  getUser: requestHandler(async (req, res) => {
    const userId = await tokens.getUserIdFromRequest(req)
    res.json({ userId })
  })
}
