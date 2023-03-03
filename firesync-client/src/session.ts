import { Api } from './api'
import logging from './logging'

const logger = logging('session')

export class Session {
  accessToken?: string
  refreshToken?: string
  api: Api

  constructor(api: Api) {
    this.api = api
    const session = this.loadSession()
    if (session) {
      this.accessToken = session.accessToken
      this.refreshToken = session.refreshToken
    }
  }

  private loadSession() {
    const params = new URLSearchParams(
      window.location.hash.substring(1) // skip the first char (#)
    )

    // Load session from URL if present
    if (params.get('token_type') === 'bearer') {
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        const session = { accessToken, refreshToken }
        logger.debug('loading session from url', session)
        localStorage.setItem('session', JSON.stringify(session))
        window.location.hash = ''
        return session
      }
    }

    // Load session from local storage if present
    const session = localStorage.getItem('session')
    if (session) {
      const { accessToken, refreshToken } = JSON.parse(
        session
      ) as Partial<Session>
      logger.debug('loading session from local storage', {
        accessToken,
        refreshToken
      })
      if (accessToken && refreshToken) {
        return { accessToken, refreshToken }
      }
    }

    logger.debug('no session found')
  }
}
