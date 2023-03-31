<p align="center">
⚠️ <em>This is an early preview and is not suitable for production use yet! Do no expect backwards compatibility with future versions yet.</em>
</p>

<p align="center">
If you think FireSync looks promising and would like to build on it, please email us at <a href="mailto:hello@firesync.live">hello@firesync.live</a> and we'd love to work with you to make sure FireSync fits your needs.
</p>

<h1 align="center">🔥 FireSync</h1>

FireSync is a complete backend for building a real-time collaborative app. You can focus on your application's core logic and UX, while the FireSync takes care of:

* **🚀 Real-time collaboration via [Yjs](https://github.com/yjs/yjs)**
* **🗄️ [Postgres](https://www.postgresql.org/) backed storage**
* **🧑 User management**
* **🔓 Role based permissions**
* **📧 Email invites to join docs (coming soon)**
* **👥 Teams, groups and anonymous access (coming soon)**
* **👀 Online indicators and user cursors (coming soon)**
* **🕒 Full browseable history of changes (coming soon)**
* **↩️ Rollback to previous versions (coming soon)**
* **💬 Comments (coming soon)**
* **💡 Suggesting mode and track changes (coming soon)**
* **🔔 Notifications for changes and comments (coming soon)**

## 📢 Stay up to date

[Sign up to our mailing list](https://cdn.forms-content.sg-form.com/b839aa5d-cbac-11ed-8fbd-bebc803b2bd5) to stay up to date as we develop FireSync in the open. We'll let you know about new features, our ideas and our future roadmap.

## Documentation

See [https://docs.firesync.dev/](https://docs.firesync.dev/) for a complete documentation guide. Or dive straight into:

* [Tutorial](https://docs.firesync.dev//tutorials/) - Start here if it's your first time with FireSync to get an understanding of how it all works.
* [Guides](https://docs.firesync.dev/category/guides) - In depth guides on how to do specific things with FireSync.
* [Reference](https://docs.firesync.dev/category/reference) - Complete reference guides for the FireSync libraries with API specs.

## Getting Started

Here's a quick overview setting up FireSync looks like for your app.

### Running the backend

Install `@firesync/server`:

```bash
$ npm install @firesync/server
```

You will need a Postgres database. If you don't have one running you can start one quickly using docker:

```
$ docker run --name firesync-postgres -e POSTGRES_PASSWORD=postgres POSTGRES_DATABASE=firesync -d -p 5432:5432 postgres
```

Run `@firesync/server setup` to create the necessary tables in Postgres and set up the default project:

```bash
$ export FS_POSTGRES_USER=postgres
$ export FS_POSTGRES_PASSWORD=postgres
$ export FS_POSTGRES_DATABASE=firesync
$ npx @firesync/server setup
```

You can now start FireSync:

```
$ npx @firesync/server server
```

FireSync will be running at [localhost:5000](http://localhost:5000).

### User authentication

To allow users to log in via Google Oauth, [create some Google OAuth Client Id credentials](https://developers.google.com/workspace/guides/create-credentials#oauth-client-id) and configure them for your project with the `FS_GOOGLE_AUTH_CLIENT_ID` and `FS_GOOGLE_AUTH_CLIENT_SECRET` environment variables. You'll need to specify `https://localhost:5000/auth/google/callback` as an 'Authorized redirect URI' for the OAuth credentials.

```
$ export FS_GOOGLE_AUTH_CLIENT_ID=...
$ export FS_GOOGLE_AUTH_CLIENT_SECRET=...
```

### Building your app

We'll demonstrate how to build a very simple collaborative React app using FireSync as our backend. First create a new React app (see [React docs](https://reactjs.org/docs/create-a-new-react-app.html) for more info):

```bash
$ npx create-react-app acme-frontend
$ cd acme-frontend
$ npm start
```

Configure the server to redirect back to your app after authenticating with Google with the `FS_GOOGLE_AUTH_SUCCESS_REDIRECT_URL` environment variable:

```sh
$ export FS_GOOGLE_AUTH_SUCCESS_REDIRECT_URL=http://localhost:3000
```

Install `@firesync/client`:

```bash
$ npm install @firesync/client
```

#### Configure Client

Configure FireSync to point to our back-end:

```ts
import Firesync from 'firesync-client'
const firesync = new Firesync({
  host: 'http://localhost:5000'
})
```

#### Authentication

We can check if the user logged in, and display either a logged in or logged out button. See [LoginWrapper](https://github.com/firesync-org/firesync/blob/main/examples/playground/src/LoginWrapper.tsx) in the `examples/playground/` folder for a more detailed example.

```tsx
export default function Login() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    firesync.isLoggedIn().then((loggedIn) => {
      setLoggedIn(loggedIn)
      setLoading(false)
    })
  }, [])

  const logIn = (provider: string) => {
    // Will redirect to the FireSync server to start the Google
    // OAuth flow
    firesync.logIn({ provider })
  }

  const logOut = async () => {
    await firesync.logOut()
    setLoggedIn(false)
  }

  if (loading) {
    return <div>Loading...</div>
  } else if (loggedIn) {
    return <button onClick={() => logOut()}>Log Out</button>
  } else {
    return <button onClick={() => logIn('google')}>Log in with Google</button>
  }
}

```

#### List and Creating Documents

Once the user is logged in you can list the docs the user has access to:

```tsx
firesync.getUserRoles().then(({ user: { roles } }) => {
  console.log('You can access the following documents:', roles.map((r) => r.docKey))
})
```

And create a new collaborative document:

```ts
firesync.createDoc('foo')
  .then(() => { console.log('successfully created foo!') })
```

See [DocsList](https://github.com/firesync-org/firesync/blob/main/examples/playground/src/DocsList.tsx) in the `examples/playground/` folder for a more detailed example.

#### Collaborative Editing

The bit you've been waiting for! Once you have a user and a doc, you can subscribe to it to get a local [Yjs doc](https://github.com/yjs/yjs) which will sync any changes to the FireSync back-end and recieve any changes from other users.

```ts
const ydoc = firesync.connection.subscribe('foo')
```

Here is an example that binds ths FireSync Yjs doc to the [Quill](https://github.com/quilljs/quill) rich-text editor, for real-time collaboration of rich-text documents:

```tsx
// You will need to npm install --save react-quill y-quill
import React, { useEffect, useRef } from 'react'
import ReactQuill from 'react-quill'
import { QuillBinding } from 'y-quill'
import 'react-quill/dist/quill.snow.css'

function Editor() {
  const quillRef = useRef<ReactQuill | null>(null)

  useEffect(() => {
    // Subscribe to the 'foo' doc we created above. Any local updates
    // to this ydoc will be sent to the server, and any updates from 
    // other users will also get synced to this ydoc
    const ydoc = firesync.connection.subscribe('foo')

    // Bind the ydoc to the Quill editor
    const quill = quillRef.current?.editor
    const binding = new QuillBinding(ydoc.getText('text'), quill)

    // Tidy up everything on unmount
    return () => {
      firesync.connection.unsubscribe(docKey)
      binding.destroy()
    }
  }, [])

  return (
    <>
      <div className="bg-white">
        <ReactQuill theme="snow" ref={quillRef} />
      </div>
    </>
  )
}
```

See [Editor](https://github.com/firesync-org/firesync/blob/main/examples/playground/src/Editor.tsx) in the `examples/playground/` folder for a more detailed example.
