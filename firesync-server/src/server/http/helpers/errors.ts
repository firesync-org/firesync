import { FiresyncErrorCode } from '../../../shared/errors'

export class HttpError extends Error {
  httpStatusCode: number
  fsErrorCode: FiresyncErrorCode
  meaning: string
  constructor(
    message: string,
    httpStatusCode: number,
    meaning: string,
    fsErrorCode = FiresyncErrorCode.API_REQUEST_ERROR
  ) {
    super(message)
    this.name = 'HttpError'
    this.meaning = meaning
    this.httpStatusCode = httpStatusCode
    this.fsErrorCode = fsErrorCode
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

export class BadRequestHttpError extends HttpError {
  constructor(message: string, fsErrorCode?: FiresyncErrorCode) {
    super(message, 400, 'Bad Request', fsErrorCode)
    this.name = 'BadRequestError'
    Object.setPrototypeOf(this, BadRequestHttpError.prototype)
  }
}

export class UnauthorizedHttpError extends HttpError {
  constructor(message: string, fsErrorCode?: FiresyncErrorCode) {
    super(message, 401, 'Unauthorized', fsErrorCode)
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedHttpError.prototype)
  }
}

export class NotFoundHttpError extends HttpError {
  constructor(message: string, fsErrorCode?: FiresyncErrorCode) {
    super(message, 404, 'Not Found', fsErrorCode)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundHttpError.prototype)
  }
}

// Use this if the doc isn't found, OR if the user doesn't have access,
// so that we don't leak information about which docs exist
export class CannotAccessDocHttpError extends HttpError {
  constructor(docKey: string) {
    const message = `Doc does not exist, or you do not have access: ${docKey}`
    super(message, 404, 'Not Found')
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundHttpError.prototype)
  }
}
