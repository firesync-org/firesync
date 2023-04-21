import WebSocket from 'ws'

import Firesync from '@firesync/client'

export const getClient = ({
  connect = true,
  token
}: {
  connect?: boolean
  token: string
}) => {
  const client = new Firesync({
    baseUrl: 'http://localhost:5000',
    connect,
    CustomWebSocket: WebSocket,
    token
  })

  return client
}
