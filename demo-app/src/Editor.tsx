import React, { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactQuill from 'react-quill'
import { QuillBinding } from 'y-quill'

import 'react-quill/dist/quill.snow.css'

import { firesync } from './firesync'

export default function Editor() {
  const { docKey } = useParams()
  if (docKey === undefined) {
    throw new Error('expected docKey in params')
  }

  const quillRef = useRef<ReactQuill | null>(null)

  useEffect(() => {
    // Subscribe to the 'foo' doc we created above. Any local updates
    // to this ydoc will be sent to the server, and any updates from
    // other users will also get synced to this ydoc
    const ydoc = firesync.connection.subscribe(docKey)

    // Bind the ydoc to the Quill editor
    const quill = quillRef.current?.editor
    const binding = new QuillBinding(ydoc.getText('t'), quill)

    // Tidy up everything on unmount
    return () => {
      firesync.connection.unsubscribe(docKey)
      binding.destroy()
    }
  }, [])

  return (
    <>
      <h1 className="h5 mb-3">
        <Link to="/">Docs</Link> &gt; {docKey}
      </h1>
      <div className="bg-white">
        <ReactQuill theme="snow" ref={quillRef} />
      </div>
    </>
  )
}
