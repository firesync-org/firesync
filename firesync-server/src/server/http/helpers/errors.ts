export class HttpError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, 400)
    this.name = 'BadRequestError'
    Object.setPrototypeOf(this, BadRequestError.prototype)
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(message, 401)
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(message, 404)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

// Use this if the doc isn't found, OR if the user doesn't have access,
// so that we don't leak information about which docs exist
export class CannotAccessDocError extends HttpError {
  constructor(docKey: string) {
    const message = `Doc does not exist, or you do not have access: ${docKey}`
    super(message, 404)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}
