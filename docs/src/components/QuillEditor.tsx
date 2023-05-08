import React, { useEffect, useRef } from 'react'
import Quill from 'quill'
import QuillCursors from 'quill-cursors'
import ReactQuill from 'react-quill'
import { QuillBinding } from 'y-quill'
import 'react-quill/dist/quill.snow.css'
import '../css/quill.css'
import { useFireSync, useUniqueDocKey } from '../firesync'
import { Y } from '@firesync/client'
import { useAwareness, useSubscribeToDoc } from '../hooks'

Quill.register('modules/cursors', QuillCursors)

type QuillEditorProps = {
  docKey: string
  initialValue: string
}

export function QuillEditor({
  docKey: partialDocKey,
  initialValue
}: QuillEditorProps) {
  const quillRef = useRef<ReactQuill | null>(null)
  const firesync = useFireSync()
  const docKey = useUniqueDocKey(partialDocKey)
  const ydoc = useSubscribeToDoc(firesync, docKey)
  const awareness = useAwareness(firesync, docKey)

  useEffect(() => {
    if (!ydoc || !awareness) return

    const sv = Y.decodeStateVector(Y.encodeStateVector(ydoc))
    if (sv.size === 0) {
      const clientID = ydoc.clientID
      // Use clientID 0 for the default content so that we always use the same clientID,
      // so if we do it multiple times it has no effect
      ydoc.clientID = 0
      ydoc.getText('t').insert(0, initialValue)
      ydoc.clientID = clientID
    }

    // Bind the ydoc to the Quill editor
    const quill = quillRef.current?.editor
    const binding = new QuillBinding(ydoc.getText('t'), quill, awareness)

    // Tidy up everything on unmount
    return () => {
      binding.destroy()
    }
  }, [ydoc, awareness])

  return (
    <>
      <ReactQuill theme="snow" ref={quillRef} modules={{ cursors: true }} />
    </>
  )
}
