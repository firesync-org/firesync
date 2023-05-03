import { FireSync } from '@firesync/client'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'

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
      'Please set FS_TOKEN and FS_BASE_URL as environment variables'
    )
  }

  firesync = new FireSync({
    baseUrl,
    token
  })
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

  namespace = window.crypto.randomUUID()
  localStorage.setItem('namespace', namespace)
  window.location.hash = `namespace=${encodeURIComponent(namespace)}`

  return namespace
}
