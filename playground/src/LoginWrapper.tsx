import React, { ReactNode, useEffect, useState } from 'react'
import { firesync } from './firesync'

export default function LoginWrapper({ children }: { children: ReactNode }) {
  const [_userId, setUserId] = useState<number | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { userId } = await firesync.getUser()
      if (userId !== undefined) {
        setUserId(userId)
        setLoggedIn(true)
      } else {
        setLoggedIn(false)
      }
    }
    getUser()
  }, [])

  // TODO: Loading state

  if (!loggedIn) {
    return (
      <div className="card mb-2">
        <div className="card-body">
          <a
            className="btn btn-primary mt-2"
            href={`https://${firesync.host}/auth/google`}>
            Log In
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
