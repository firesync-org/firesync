import { useEffect, useState } from 'react'
import { Role, roles } from '@firesync/client'

import { Modal, ModalProps } from './Modal'
import { displayRole } from './helpers'
import { firesync } from './firesync'
import { DocRole } from './DocsList'

type ShareModalProps = ModalProps & {
  docKey: string
}

export function ShareModal(props: ShareModalProps) {
  const { docKey } = props
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('write')
  const [sharedWith, setSharedWith] = useState<string | null>(null)

  const [docRoles, setDocRoles] = useState<DocRole[]>([])

  useEffect(() => {
    firesync.getDocRoles(docKey).then(({ data }) => {
      if (data) {
        const {
          doc: { roles }
        } = data
        setDocRoles(roles)
      }
    })
  }, [])

  const share = async () => {
    await firesync.createInvite(docKey, { email, role })
    setSharedWith(email)
  }

  return (
    <Modal {...props}>
      <div className="modal-header">
        <h5 className="modal-title">Share Document</h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="modal"
          aria-label="Close"></button>
      </div>
      <div className="modal-body">
        <div className="d-grid mb-2">
          {docRoles.map((role) => (
            <div key={role.userId}>
              <div className="row align-items-center">
                <div className="col">
                  <div className="row">
                    <div className="col-8">{role.userId}</div>
                    <div className="col-4">{displayRole(role.role)}</div>
                  </div>
                </div>
                <div className="col col-auto">
                  <button type="button" className="btn btn-secondary btn-sm">
                    Remove
                  </button>
                </div>
              </div>
              <hr className="my-2" />
            </div>
          ))}
        </div>

        {sharedWith !== null && (
          <div className="alert alert-success" role="alert">
            You shared <strong>{docKey}</strong> with <strong>{email}</strong>
          </div>
        )}
        <form
          className="row g-2"
          onSubmit={(e) => {
            share()
            e.preventDefault()
          }}>
          <div className="col">
            <div className="row g-2">
              <div className="col-8">
                <input
                  type="email"
                  className="form-control"
                  placeholder="collaborator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="col-4">
                <select
                  className="form-select"
                  aria-label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}>
                  {roles.map((role) => (
                    <option value={role}>{displayRole(role)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="col col-auto">
            <button type="submit" className="btn btn-primary">
              Share
            </button>
          </div>
        </form>
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary"
          data-bs-dismiss="modal">
          Close
        </button>
      </div>
    </Modal>
  )
}
