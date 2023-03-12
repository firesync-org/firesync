import { NextFunction, RequestHandler, Response, Request } from 'express'

type FiresyncAsyncRequestHandler<RequestType> = (
  req: RequestType,
  res: Response,
  next: NextFunction
) => Promise<any>

type FiresyncRequestHandler<RequestType> = (
  req: RequestType,
  res: Response,
  next: NextFunction
) => any

// A helper wrapper to sort out the typings & error handling
export const requestHandler = <RequestType = Request>(
  requestHandler:
    | FiresyncAsyncRequestHandler<RequestType>
    | FiresyncRequestHandler<RequestType>
) => {
  return (async (req, res, next) => {
    try {
      await requestHandler(req as RequestType, res, next)
    } catch (error) {
      next(error)
    }
  }) as RequestHandler
}
