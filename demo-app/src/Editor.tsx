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
    const ydoc = firesync.connection.subscribe(docKey)
    const quill = quillRef.current?.editor
    const binding = new QuillBinding(ydoc.getText('t'), quill)
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
