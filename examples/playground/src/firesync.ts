import Firesync from '@firesync/client'

let port: string | null = null
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(
    window.location.hash.substring(1) // skip the first char (#)
  )
  port = params.get('port')
}
if (!port) {
  port = '5000'
}

export const firesync = new Firesync({
  baseUrl: `http://localhost:${port}`
})
;(window as any).firesync = firesync
