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
    const doc = firesync.subscribe(docKey)
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
    const awareness = firesync.awareness(docKey)
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
    const awareness = firesync.awareness(docKey)
    const onChange = () => {
      setAwareness(Object.fromEntries(awareness.getStates()))
    }
    awareness.on('change', onChange)
    return () => awareness.off('change', onChange)
  }, [firesync])

  return awareness
}

export const useRandomUser = () => {
  const [user, setUser] = useState<{ name: string; color: string }>()

  if (!user) {
    setUser({
      name: [randomAdjective(), randomAnimal()].join(' '),
      color: `hsl(${Math.floor(Math.random() * 360)} 100% 30%)`
    })
  }

  return user
}

function randomEntry<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]
}

const randomAdjective = () =>
  randomEntry([
    'Bubbly',
    'Zany',
    'Spunky',
    'Quirky',
    'Wacky',
    'Whimsical',
    'Cheeky',
    'Silly',
    'Goofy',
    'Playful',
    'Zesty',
    'Jazzy',
    'Sassy',
    'Funky',
    'Dapper',
    'Groovy',
    'Snazzy',
    'Dashing',
    'Sprightly',
    'Peppy'
  ])

const randomAnimal = () =>
  randomEntry([
    'Narwhal',
    'Axolotl',
    'Pangolin',
    'Quokka',
    'Meerkat',
    'Fennec Fox',
    'Red Panda',
    'Sloth',
    'Llama',
    'Alpaca',
    'Capibara',
    'Hedgehog',
    'Kangaroo',
    'Platypus',
    'Otter',
    'Puma',
    'Toucan',
    'Wallaby',
    'Salamander',
    'Chinchilla'
  ])
