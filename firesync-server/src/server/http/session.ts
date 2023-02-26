import express, { RequestHandler } from 'express'
import expressSession from 'express-session'
import { IncomingMessage } from 'http'
import pgSession from 'connect-pg-simple'
import { db } from '../../db/db'

declare module 'express-session' {
  interface SessionData {
    passport: {
      user?: {
        userId: number
      }
    }
  }
}

const PGSession = pgSession(expressSession)

let _sessionParser: RequestHandler | undefined
export const getSessionParser = () => {
  if (_sessionParser === undefined) {
    const SESSION_SECRET = process.env.SESSION_SECRET
    if (SESSION_SECRET === undefined) {
      console.error('Please set SESSION_SECRET environment variable')
      process.exit(1)
    }
    _sessionParser = expressSession({
      store: new PGSession({
        pool: db.pool
      }),
      secret: SESSION_SECRET,
      resave: false,
      cookie: {
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      },
      saveUninitialized: false
    })
  }

  return _sessionParser
}

export const parseExpressSession = <SessionData>(
  request: IncomingMessage,
  sessionParser: express.RequestHandler
): Promise<expressSession.Session & Partial<SessionData>> => {
  return new Promise((resolve, reject) => {
    const _request = request as any
    sessionParser(_request, {} as any, function (error) {
      if (error) return reject(error)
      resolve(_request.session as expressSession.Session & Partial<SessionData>)
    })
  })
}
