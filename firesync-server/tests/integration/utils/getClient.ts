import WebSocket from 'ws'

import { Connection } from 'firesync-client'

const defaultHost = `${process.env.PROJECT_NAME}.api.localtest.me`

export const getClient = ({
  host = defaultHost,
  connect = true,
  cookie = ''
}: {
  host?: string
  connect?: boolean
  cookie?: string
} = {}) => {
  const connection = new Connection(host, {
    CustomWebSocket: WebSocket,
    websocketOptions: {
      headers: {
        cookie
      }
    },
    connect
  })

  return { connection }
}
