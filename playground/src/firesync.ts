import Firesync from '@firesync/client'
export const firesync = new Firesync({
  baseUrl: 'http://localhost:5000'
})
;(window as any).firesync = firesync
