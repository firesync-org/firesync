import Firesync from 'firesync-client'
export const firesync = new Firesync({
  project: 'foo',
  host: 'api.localtest.me'
})
;(window as any).firesync = firesync
