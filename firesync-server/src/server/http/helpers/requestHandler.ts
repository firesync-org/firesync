import { NextFunction, RequestHandler, Response, Request } from 'express'
import { Project } from '../../../db/db'

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

export type RequestWithProject = Request & {
  firesync: {
    project: Pick<
      Project,
      | 'id'
      | 'name'
      | 'cors_allowed_origins'
      | 'invite_success_redirect_url'
      | 'invite_failure_redirect_url'
      | 'redeem_invite_url'
      | 'host'
    >
  }
}

// A helper wrapper to sort out the typings & error handling
export const requestHandler = <RequestType = RequestWithProject>(
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
