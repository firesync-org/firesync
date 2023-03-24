---
sidebar_position: 4
---

# Logging In

Now that we've set up FireSync server to support logging in with Google, let's add the necessary client code in our todo app to support logging in and out.

## Configure FireSync Client

To start with, let's configure our FireSync Client. Create a new file called `src/firesync.ts` which will set up a new FireSync client instsance that can shared with the rest of the application:

```ts title=src/firesync.ts
import Firesync from '@firesync/client'
export const firesync = new Firesync({
  baseUrl: 'http://localhost:5000'
})
```

This creates a new FireSync client pointing at the FireSync server running on your local machine at `http://localhost:5000`.

## Authentication Methods

We will create a React component which checks whether we are logged in before rendering the rest of the app. If we aren't logged in then we will prompt the user to log in first.

We'll need use three FireSync methods on the FireSync client:

### `isLoggedIn`

We'll use `firesync.isLoggedIn` to check whether the user is logged in. We'll set a loading state while we're checking this and then update the loading state and the user logged in state once we get a response from the FireSync server:

```ts
const [loggedIn, setLoggedIn] = useState(false)
const [loading, setLoading] = useState(true)

useEffect(() => {
  firesync.isLoggedIn().then(({ data: loggedIn }) => {
    setLoggedIn(loggedIn)
    setLoading(false)
  })
}, [])
```

### `logIn`

To actually log in, we will call `firesync.logIn` with the `'google'` provider. This will redirect the user's browser to the Google Authentication flow that we set up in the previous step, via the FireSync server at `http://localhost:5000/auth/google`.

```ts
firesync.logIn({ provider: 'google' })
```

When the log in flow returns to the app, it will include the session credentials as part of the redirect URL, which the FireSync client will automatically read from the URL and set up the session for future use.

### `logOut`

If the user wants to log out, we can call `firesync.logOut`:

```ts
const logOut = async () => {
  await firesync.logOut()
  setLoggedIn(false)
}
```

## LoginWrapper

Let's put these methods together in a file called `src/LoginWrapper.tsx` with some Bootstrap UI to hook these methods up to buttons, and render different screens depending on the loading and logged in state:

```ts title=src/LoginWrapper.tsx
import React, { ReactNode, useEffect, useState } from 'react'
import { firesync } from './firesync'

export default function LoginWrapper({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    firesync.isLoggedIn().then(({ data: loggedIn }) => {
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
    <>
      <nav className="navbar navbar-light bg-light px-3 mb-3">
        <div className="navbar-brand">
          FireSync Todo List
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => logOut()}>
          Log Out
        </button>
      </nav>
      <div className="container">{children}</div>
    </>
  )
}
```

## Add LoginWrapper to App

Finally, let's update our app to include this log in screen before the user can continue:


```ts title=src/App.tsx
import LoginWrapper from "./LoginWrapper";
import TodoList from "./TodoList";

export default function App() {
  return (
    <LoginWrapper>
      <TodoList />
    </LoginWrapper>
  );
}
```

