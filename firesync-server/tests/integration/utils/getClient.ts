import WebSocket from 'ws'

import Firesync, { Session, Api } from '@firesync/client'

const api = new Api('http://localhost:5000')

export const getClient = ({
  connect = true,
  session
}: {
  connect?: boolean
  session?: Session
} = {}) => {
  if (!session) {
    session = new Session(api)
  }
  const client = new Firesync({
    baseUrl: 'http://localhost:5000',
    connect,
    session,
    WebSocket
  })

  return client
}
