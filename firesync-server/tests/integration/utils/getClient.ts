import WebSocket from 'ws'

import { Connection, Session, Api } from '@firesync/client'

const api = new Api('http://localhost:5000')

export const getClient = ({
  connect = true,
  session = new Session(api)
}: {
  connect?: boolean
  session?: Session
} = {}) => {
  const connection = new Connection('http://localhost:5000', session, {
    CustomWebSocket: WebSocket,
    connect
  })

  return { connection, session }
}
