import { ErrorRequestHandler } from 'express'
import { HttpError } from '../helpers/errors'

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  if (err instanceof HttpError) {
    return res
      .status(err.httpStatusCode)
      .json({ message: err.message, code: err.fsErrorCode })
  } else {
    return next(err)
  }
}
