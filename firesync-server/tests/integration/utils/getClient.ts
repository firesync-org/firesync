import WebSocket from 'ws'

import Firesync, { Connection, Session, Api } from '@firesync/client'

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
    WebSocket
  })

  const connection = client.connection

  return { client, connection, session }
}
