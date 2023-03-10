import { useState } from 'react'
import Firesync from '@firesync/client'

// TODO: This should go into a library like @firesync/react
export function usePendingInvite(firesync: Firesync) {
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
