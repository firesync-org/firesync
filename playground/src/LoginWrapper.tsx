import React, { ReactNode, useEffect, useState } from 'react'
import { firesync } from './firesync'

export default function LoginWrapper({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const loggedIn = await firesync.isLoggedIn()
      if (loggedIn) {
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
            href={`${firesync.baseUrl}/auth/google`}>
            Log In
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
