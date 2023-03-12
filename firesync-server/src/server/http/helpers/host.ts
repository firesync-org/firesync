import { IncomingMessage } from 'http'
import { config } from '../../../config'
import { BadRequestHttpError } from './errors'

export const getHostName = (req: IncomingMessage) => {
  let hostName = req.headers.host

  if (config.TRUST_PROXY) {
    const forwardedHost = req.headers['x-forwarded-host']
    if (typeof forwardedHost === 'string') {
      hostName = forwardedHost
    }
  }

  if (hostName === undefined) {
    throw new BadRequestHttpError('No host header provided')
  }

  return hostName
}
