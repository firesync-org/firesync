import WebSocket from 'ws'

import Firesync, { Session, Api } from '@firesync/client'

const api = new Api('http://localhost:5000')

export const getClient = ({
  connect = true,
  session = new Session(api)
}: {
  connect?: boolean
  session?: Session
} = {}) => {
  const client = new Firesync({
    baseUrl: 'http://localhost:5000',
    connect,
    session,
    WebSocket
  })

  return client
}
