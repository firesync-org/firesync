import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { firesync } from './firesync'

type Doc = {
  docKey: string
  role: string
}

export default function DocIndex() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [newDocKey, setNewDocKey] = useState('')

  useEffect(() => {
    firesync.getUserRoles().then(({ user: { roles } }) =>
      setDocs(
        roles.map((r) => ({
          docKey: r.docKey,
          role: r.role
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
            docKey: r.docKey,
            role: r.role
          }))
        )
      )
  }

  const displayRole = (role: string) => {
    if (role === 'admin') return 'Owner'
    if (role === 'write') return 'Editor'
    if (role === 'read') return 'Reader'
    return 'Unknown'
  }

  return (
    <>
      <h1 className="h5 mb-3">Docs</h1>
      <div className="d-grid gap-2">
        {docs.map(({ docKey, role }) => (
          <Link
            to={`docs/${encodeURIComponent(docKey)}`}
            className="text-decoration-none">
            <div key={docKey} className="card">
              <div className="card-body px-3 py-2 d-flex justify-content-between">
                <div>{docKey}</div>
                <div className="text-secondary">{displayRole(role)}</div>
              </div>
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
