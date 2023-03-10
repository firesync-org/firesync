import { firesync } from './firesync'
import { usePendingInvite } from './hooks/usePendingInvite'

export default function PendingInvite() {
  const { invite, accept, error } = usePendingInvite(firesync)

  if (!invite) return null

  if (error) {
    return (
      <div className="alert alert-danger mb-4" role="alert">
        Sorry, something went wrong accepting your invite. It may have expired.
        Please ask for another invite.
      </div>
    )
  }

  return (
    <div
      className="alert alert-info mb-4 d-flex justify-content-between"
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
