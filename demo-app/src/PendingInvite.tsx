import { useState } from 'react'
import { firesync } from './firesync'

export default function PendingInvite() {
  // TODO: Factor this out into a usePendingInvite hook?
  const [pendingInvite, setPendingInvite] = useState(firesync.pendingInvite)

  if (!pendingInvite) return null

  const invite = pendingInvite.invite

  const accept = async () => {
    await pendingInvite.accept()
    setPendingInvite(undefined)
  }

  return (
    <div
      className="alert alert-info mb-2 d-flex justify-content-between"
      role="alert">
      <div className="d-flex align-items-center">
        <span>
          You have been invited to <strong>{invite.docKey}</strong>.
        </span>
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => accept()}>
        Accept
      </button>
    </div>
  )
}
