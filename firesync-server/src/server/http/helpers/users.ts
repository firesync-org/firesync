import { Request } from 'express'
import { UnauthorizedError } from './errors'

export const getUserId = (req: Request) => {
  const userId = req.user?.userId
  if (userId === undefined) {
    throw new UnauthorizedError('User is not logged in')
  }
  return userId
}
