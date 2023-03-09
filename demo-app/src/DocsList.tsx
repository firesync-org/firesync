import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { firesync } from './firesync'

export default function DocIndex() {
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
      <h1 className="h5 mb-3">Docs</h1>
      <div className="d-grid gap-2">
        {docs.map(({ docKey }) => (
          <Link to={`docs/${encodeURIComponent(docKey)}`}>
            <div key={docKey} className="card">
              <div className="card-body px-3 py-2">{docKey}</div>
            </div>
          </Link>
        ))}

        <hr className="my-2" />

        <form className="row g-3" onSubmit={() => createDoc(newDocKey)}>
          <div className="col">
            <input
              type="text"
              className="form-control"
              placeholder="Create New Doc"
              value={newDocKey}
              onChange={(e) => setNewDocKey(e.target.value)}
            />
          </div>
          <div className="col col-auto">
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
