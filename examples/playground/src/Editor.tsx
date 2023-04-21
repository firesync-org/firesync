import React, { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import ReactQuill from 'react-quill'
import { QuillBinding } from 'y-quill'

import 'react-quill/dist/quill.snow.css'

import { useFiresync } from './firesync'

export default function Editor() {
  const { docKey } = useParams()
  if (docKey === undefined) {
    throw new Error('expected docKey in params')
  }

  const firesync = useFiresync()

  const quillRef = useRef<ReactQuill | null>(null)

  useEffect(() => {
    if (!firesync) return

    // Subscribe to the 'foo' doc we created above. Any local updates
    // to this ydoc will be sent to the server, and any updates from
    // other users will also get synced to this ydoc
    const ydoc = firesync.subscribe(docKey)

    // Bind the ydoc to the Quill editor
    const quill = quillRef.current?.editor
    const binding = new QuillBinding(ydoc.getText('t'), quill)

    // Tidy up everything on unmount
    return () => {
      firesync.unsubscribe(docKey)
      binding.destroy()
    }
  }, [firesync])

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between mb-2">
        <h1 className="h5">{docKey}</h1>
      </div>
      <div className="bg-white">
        <ReactQuill theme="snow" ref={quillRef} />
      </div>
    </div>
  )
}
