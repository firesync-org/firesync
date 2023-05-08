import { FireSync } from '@firesync/client'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import { randomUser } from './randomUser'

let firesync: FireSync | undefined

export const useFireSync = () => {
  if (firesync) return firesync

  const {
    siteConfig: { customFields }
  } = useDocusaurusContext()

  const token = customFields?.firesyncToken
  const baseUrl = customFields?.firesyncBaseUrl

  if (typeof token !== 'string' || typeof baseUrl !== 'string') {
    throw new Error(
      'Please set FS_DOCS_TOKEN and FS_DOCS_BASE_URL as environment variables'
    )
  }

  firesync = new FireSync({
    baseUrl,
    token
  })

  const user = randomUser()
  firesync.setUserDisplayName(user.name)
  firesync.setUserColor(user.color)

  return firesync
}

export const useUniqueDocKey = (docKey: string) => {
  const namespace = useUniqueNamespace()
  return `doc-examples/${namespace}/${docKey}`
}

/**
 * Gets a unique namespace that is shared between browser tabs
 * of a local user or can be shared via the URL for testing collaboration
 * with known collaborators. This avoids having a global document
 * where our examples get polluted by being globally editable.
 *
 * Looks at the URL hash first, then local storage, then creates one
 * if none present.
 */
const useUniqueNamespace = () => {
  const params = new URLSearchParams(
    window.location.hash.substring(1) // skip the first char (#)
  )
  let namespace = params.get('namespace')

  if (namespace) {
    localStorage.setItem('namespace', namespace)
    return namespace
  }

  namespace = localStorage.getItem('namespace')
  if (namespace) {
    window.location.hash = `namespace=${encodeURIComponent(namespace)}`
    return namespace
  }

  namespace = generateUUID()
  localStorage.setItem('namespace', namespace)
  window.location.hash = `namespace=${encodeURIComponent(namespace)}`

  return namespace
}

function generateUUID() {
  // Generate a random 128-bit array
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)

  // Adjust the array to follow UUID version 4 rules
  array[6] = (array[6] & 0x0f) | 0x40
  array[8] = (array[8] & 0x3f) | 0x80

  // Convert the array into a UUID string
  const segments = [
    array.slice(0, 4),
    array.slice(4, 6),
    array.slice(6, 8),
    array.slice(8, 10),
    array.slice(10, 16)
  ]

  return segments
    .map((segment) => {
      const hexArray = Array.from(segment, (byte) =>
        byte.toString(16).padStart(2, '0')
      )
      return hexArray.join('')
    })
    .join('-')
}
