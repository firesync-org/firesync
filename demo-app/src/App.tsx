import React, { useEffect, useRef, useState } from 'react'
import ReactQuill from 'react-quill'
import { QuillBinding } from 'y-quill'

import 'react-quill/dist/quill.snow.css'

import {
  createBrowserRouter,
  Link,
  RouterProvider,
  useParams
} from 'react-router-dom'

import { firesync } from './firesync'
import LoginWrapper from './LoginWrapper'

const router = createBrowserRouter([
  {
    path: '/',
    element: <DocIndex />
  },
  {
    path: 'docs/:docKey',
    element: <Editor />
  }
])

export default function App() {
  return (
    <div className="container py-3">
      <LoginWrapper>
        <RouterProvider router={router} />
      </LoginWrapper>
    </div>
  )
}

function DocIndex() {
  const [docs, setDocs] = useState<{ docKey: string }[]>([])
  const [newDocKey, setNewDocKey] = useState('')

  useEffect(() => {
    firesync.getUserRoles().then(({ user: { roles } }) =>
      setDocs(
        roles.map((r) => ({
          docKey: r.docKey
        }))
      )
    )
  }, [])

  const createDoc = (docKey: string) => {
    firesync
      .createDoc(docKey)
      .then(() => setNewDocKey(''))
      .then(() => firesync.getUserRoles())
      .then(({ user: { roles } }) =>
        setDocs(
          roles.map((r) => ({
            docKey: r.docKey
          }))
        )
      )
  }

  return (
    <>
      <h4>Docs</h4>
      <ul>
        {docs.map(({ docKey }) => (
          <li key={docKey}>
            <Link to={`docs/${encodeURIComponent(docKey)}`}>{docKey}</Link>
          </li>
        ))}
      </ul>
      <input
        type="text"
        value={newDocKey}
        onChange={(e) => setNewDocKey(e.target.value)}
      />
      <button onClick={() => createDoc(newDocKey)}>Create</button>
    </>
  )
}

function Editor() {
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
      <div className="bg-white">
        <h4>{docKey}</h4>
        <ReactQuill theme="snow" ref={quillRef} />
      </div>
    </>
  )
}
