const pad = (code: number) => `${code}`.padStart(4, '0')

// TODO: Update DOCS_URL once we have somewhere hosted
const DOCS_URL = (code: number) =>
  `http://localhost:3000/docs/reference/errors#E${pad(code)}`

export class FiresyncError extends Error {
  constructor(message: string, code: number) {
    if (!message.match(/^\[E\d+\]/)) {
      message = `[E${pad(code)}] ${message} (See ${DOCS_URL(
        code
      )} for more information)`
    }
    super(message)
    this.name = 'FiresyncError'
    Object.setPrototypeOf(this, FiresyncError.prototype)
  }
}

export class AuthError extends FiresyncError {
  constructor(message: string) {
    super(message, 1)
    this.name = 'AuthError'
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

export class MessageEncodingError extends FiresyncError {
  constructor(message: string) {
    super(message, 2)
    this.name = 'MessageEncodingError'
    Object.setPrototypeOf(this, MessageEncodingError.prototype)
  }
}

export class BadRequestError extends FiresyncError {
  constructor(message: string) {
    super(message, 3)
    this.name = 'BadRequestError'
    Object.setPrototypeOf(this, BadRequestError.prototype)
  }
}

export class UnexpectedInternalStateError extends FiresyncError {
  constructor(message: string) {
    super(message, 4)
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

type ErrorInterface = new (message: string) => FiresyncError

export const ErrorsByName: Record<string, ErrorInterface> = {
  AuthError,
  MessageEncodingError,
  BadRequestError,
  UnexpectedInternalStateError,
  BadParameterError
}
