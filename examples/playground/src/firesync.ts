import Firesync from '@firesync/client'
import { useEffect, useState } from 'react'

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

export const useFireSync = () => {
  const [inited, setInited] = useState(false)
  const [firesync, setFiresync] = useState<Firesync | undefined>()

  useEffect(() => {
    if (!inited) {
      setInited(true)
      const token = process.env.REACT_APP_JWT
      if (!token) {
        throw new Error('Please set JWT env var')
      }
      const firesync = new Firesync({
        baseUrl: `http://localhost:${port}`,
        token
      })
      setFiresync(firesync)
    }
  }, [inited])

  return firesync
}
