const pad = (code: number) => `${code}`.padStart(4, '0')

// TODO: Update DOCS_URL once we have somewhere hosted
const DOCS_URL = (fsErrorCode: FiresyncErrorCode) =>
  `https://www.firesync.cloud/s/docs/reference/errors#E${pad(fsErrorCode)}`

export enum FiresyncErrorCode {
  AUTH_ERROR = 1,
  MESSAGE_ENCODING_ERROR = 2,
  BAD_REQUEST_ERROR = 3,
  UNEXPECTED_INTERNAL_STATE_ERROR = 4,
  BAD_PARAMETER_ERROR = 5,
  API_REQUEST_ERROR = 6,
  INVALID_INVITE_TOKEN_ERROR = 7
}

export class FiresyncError extends Error {
  constructor(message: string, fsErrorCode: FiresyncErrorCode) {
    if (!message.match(/^\[E\d+\]/)) {
      message = `[E${pad(fsErrorCode)}] ${message} (See ${DOCS_URL(
        fsErrorCode
      )} for more information)`
    }
    super(message)
    this.name = 'FiresyncError'
    Object.setPrototypeOf(this, FiresyncError.prototype)
  }
}

export class AuthError extends FiresyncError {
  constructor(message = 'You are not logged in or your session has expired') {
    super(message, FiresyncErrorCode.AUTH_ERROR)
    this.name = 'AuthError'
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

export class MessageEncodingError extends FiresyncError {
  constructor(message: string) {
    super(message, FiresyncErrorCode.MESSAGE_ENCODING_ERROR)
    this.name = 'MessageEncodingError'
    Object.setPrototypeOf(this, MessageEncodingError.prototype)
  }
}

export class BadRequestError extends FiresyncError {
  constructor(message: string) {
    super(message, FiresyncErrorCode.BAD_REQUEST_ERROR)
    this.name = 'BadRequestError'
    Object.setPrototypeOf(this, BadRequestError.prototype)
  }
}

export class UnexpectedInternalStateError extends FiresyncError {
  constructor(message: string) {
    super(message, FiresyncErrorCode.UNEXPECTED_INTERNAL_STATE_ERROR)
    this.name = 'UnexpectedInternalStateError'
    Object.setPrototypeOf(this, UnexpectedInternalStateError.prototype)
  }
}

export class BadParameterError extends FiresyncError {
  constructor(message: string) {
    super(message, 5)
    this.name = 'BadParameterError'
    Object.setPrototypeOf(this, BadParameterError.prototype)
  }
}

export class ApiRequestError extends FiresyncError {
  statusCode: number

  constructor(message: string, httpStatusCode: number, fsErrorCode = FiresyncErrorCode.API_REQUEST_ERROR) {
    super(message, fsErrorCode)
    this.statusCode = httpStatusCode
    this.name = 'ApiRequestError'
    Object.setPrototypeOf(this, ApiRequestError.prototype)
  }
}

type ErrorInterface = new (message: string) => FiresyncError

export const ErrorsByName: Record<string, ErrorInterface> = {
  AuthError,
  MessageEncodingError,
  BadRequestError,
  UnexpectedInternalStateError,
  BadParameterError
}
