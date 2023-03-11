import { Request } from 'express'
import { BadRequestHttpError } from '../../http/helpers/errors'

export const getDocKeyFromRequest = (req: Request) => {
  const docKey = req.body.docKey || req.query.docKey
  if (typeof docKey !== 'string') {
    throw new BadRequestHttpError(`Expected docKey to be provided as a string`)
  }
  return docKey
}
