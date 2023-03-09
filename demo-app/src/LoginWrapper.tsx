import React, { ReactNode, useEffect, useState } from 'react'
import { firesync } from './firesync'

export default function LoginWrapper({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    firesync.isLoggedIn().then((loggedIn) => {
      setLoggedIn(loggedIn)
      setLoading(false)
    })
  }, [])

  const logIn = (provider: string) => {
    firesync.logIn({ provider })
  }

  const logOut = async () => {
    await firesync.logOut()
    setLoggedIn(false)
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="spinner-grow" role="status" />
        </div>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col" style={{ maxWidth: '500px' }}>
            <div className="card">
              <div className="card-body">
                <div className="d-grid">
                  <button
                    className="btn btn-primary"
                    onClick={() => logIn('google')}>
                    Log in with Google
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <nav className="navbar navbar-light">
        <a className="navbar-brand" href="#">
          FireSync Demo App
        </a>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => logOut()}>
          Log Out
        </button>
      </nav>
      {children}
    </div>
  )
}
