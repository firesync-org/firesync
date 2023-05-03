import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Quill from 'quill'
import ReactQuill from 'react-quill'
import { QuillBinding } from 'y-quill'
import QuillCursors from 'quill-cursors'
import 'react-quill/dist/quill.snow.css'

import { useFireSync } from './firesync'
import FireSync, { Y, Awareness } from '@firesync/client'

Quill.register('modules/cursors', QuillCursors)

export default function Editor() {
  const { docKey } = useParams()
  if (docKey === undefined) {
    throw new Error('expected docKey in params')
  }

  const firesync = useFireSync()
  const doc = useDoc(firesync, docKey)
  const awareness = useAwarenessRaw(firesync, docKey)
  const user = useRandomUser()

  useEffect(() => {
    if (user && awareness) {
      awareness.setLocalStateField('user', user)
    }
  }, [user, awareness])

  const quillRef = useRef<ReactQuill | null>(null)

  useEffect(() => {
    if (!doc || !awareness) return
    const quill = quillRef.current?.editor
    const binding = new QuillBinding(doc.getText('t'), quill, awareness)

    return () => binding.destroy()
  }, [doc, awareness])

  const usersRaw = useAwareness(firesync, docKey)
  const users = Object.values(usersRaw).map((u) => u.user)

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between mb-2">
        <h1 className="h5">{docKey}</h1>
      </div>
      <div className="bg-white">
        <ReactQuill theme="snow" ref={quillRef} modules={{ cursors: true }} />
      </div>
      <div>
        <div>Online Users:</div>
        {users.map((user) => (
          <div style={{ color: user.color }}>{user.name}</div>
        ))}
      </div>
    </div>
  )
}

const useDoc = (firesync: FireSync | undefined, docKey: string) => {
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

const useAwarenessRaw = (firesync: FireSync | undefined, docKey: string) => {
  const [awareness, setAwareness] = useState<Awareness>()

  useEffect(() => {
    if (!firesync) return
    const awareness = firesync.awareness(docKey)
    setAwareness(awareness)
  }, [firesync])

  return awareness
}

const useAwareness = (firesync: FireSync | undefined, docKey: string) => {
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

const useRandomUser = () => {
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
