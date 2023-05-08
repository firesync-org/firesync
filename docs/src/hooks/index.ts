import FireSync, { Y } from '@firesync/client'
import { useEffect, useState } from 'react'
import { Awareness } from 'y-protocols/awareness'

export const useSubscribeToDoc = (
  firesync: FireSync | undefined,
  docKey: string
) => {
  const [doc, setDoc] = useState<Y.Doc>()
  useEffect(() => {
    if (!firesync) return
    const doc = firesync.subscribeYDoc(docKey)
    setDoc(doc)
    return () => {
      firesync.unsubscribe(docKey)
    }
  }, [firesync])

  return doc
}

export const useAwareness = (
  firesync: FireSync | undefined,
  docKey: string
) => {
  const [awareness, setAwareness] = useState<Awareness>()

  useEffect(() => {
    if (!firesync) return
    const awareness = firesync.subscribeAwareness(docKey)
    setAwareness(awareness)
  }, [firesync])

  return awareness
}

export const useAwarenessStates = (
  firesync: FireSync | undefined,
  docKey: string
) => {
  const [awareness, setAwareness] = useState<
    Record<string, Record<string, any>>
  >({})

  useEffect(() => {
    if (!firesync) return
    const awareness = firesync.subscribeAwareness(docKey)
    const onChange = () => {
      setAwareness(Object.fromEntries(awareness.getStates()))
    }
    awareness.on('change', onChange)
    return () => awareness.off('change', onChange)
  }, [firesync])

  return awareness
}
