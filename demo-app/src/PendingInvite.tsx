import { useState } from 'react'
import { firesync } from './firesync'
import Firesync from '@firesync/client'

export default function PendingInvite() {
  const { invite, accept, error } = usePendingInvite(firesync)

  if (!invite) return null

  if (error) {
    return (
      <div className="alert alert-danger mb-2" role="alert">
        Sorry, something went wrong accepting your invite. It may have expired.
        Please ask for another invite.
      </div>
    )
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

// TODO: This should go into a library like @firesync/react
function usePendingInvite(firesync: Firesync) {
  const [pendingInvite, setPendingInvite] = useState(firesync.pendingInvite)
  const [error, setError] = useState<any>()
  const invite = pendingInvite?.invite

  const accept = async () => {
    try {
      await pendingInvite?.accept()
      setPendingInvite(undefined)
    } catch (error) {
      setError(error)
    }
  }

  return {
    invite,
    accept,
    error
  }
}
