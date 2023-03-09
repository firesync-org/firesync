<p align="center">
⚠️ <em>This is an early preview and is not suitable for production use yet! Do no expect backwards compatibility with future versions yet.</em>
</p>

<h1 align="center">🔥 FireSync</h1>

FireSync gives you everything you need to build a real-time collaborative app out-of-box. You can focus on your application's core business logic while the FireSync open-source back-end and client libraries give you:

**🚀 Flexible Yjs documents** <br/>
[Yjs](https://github.com/yjs/yjs) is fast library for conflict-free real-time collaboration and provides flexible data types including rich-text, dictionaries and lists for whatever your application needs. There is a rich ecosytem of available libraries to help you build your app on top of Yjs, such as [TODO]

**🗄️ [Postgres](https://www.postgresql.org/) backed storage** <br/>
Data is stored in Postgres for a reliable, persistent and scalable back-end. Postgres is an industry standard so hosting and scaling your app on top of Postgres is easy.

**🧑 User management** <br/>
Users can register and login out of the box via OAuth providers like Google, or with direct email/password login (coming soon). If you have your own user authentication syste already then you can plug that in too (coming soon).

**🔓 Role based permissions** <br/>
Documents are only available to the users that have been granted explicit permissions to access them, with a flexible set of roles.

**📧 Invite emails** <br/>
Invite users to access a document with just an email address. Whether the user is already or not, FireSync handles the complexity of getting them logged in and into the correct document.

## Getting Started

See our Getting Started **TODO** docs for a more comprehensive guide, but here's the gist of what setting up FireSync looks like for your app.

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
$ export POSTGRES_USER=postgres
$ export POSTGRES_PASSWORD=postgres
$ export POSTGRES_DATABASE=firesync
$ npx @firesync/server setup
```

You can now start FireSync:

```
$ npx @firesync/server server
```

FireSync will be running at (localhost:5000)[http://localhost:5000].

### User authentication

To allow users to log in via Google Oauth, [create some Google OAuth Client Id credentials](https://developers.google.com/workspace/guides/create-credentials#oauth-client-id) and configure them for your project. You'll need to specify `https://localhost:5000/auth/google/callback` as an 'Authorized redirect URI' for the OAuth credentials.

```
$ npx @firesync/server google_auth configure --client-id <client-id> --client-secret <client-secret>
```

### Building your app

We'll demonstrate how to build a very simple collaborative React app using FireSync as our backend. First create a new React app (see [React docs](https://reactjs.org/docs/create-a-new-react-app.html) for more info):

```bash
$ npx create-react-app acme-frontend
$ cd acme-frontend
$ npm start
```

Configure the server to redirect back to your app after authenticating with Google:

```
npx @firesync/server google_auth configure --success-redirect-url http://localhost:3000
```

Install `@firesync/client`:

```bash
$ npm install @firesync/client
```

Configure FireSync to point to our back-end:

```ts
import Firesync from 'firesync-client'
const firesync = new Firesync({
  host: 'http://localhost:5000'
})
```

We can then check if we're logged in, and start the log in flow via Google if not:

**TODO: It's a bit weird that `host` below doesn't match `host` above (it's had `project` prepended to it)**

```ts
firesync.getUser()
  .then(({ userId }) => {
    if (userId !== undefined) {
      console.log('Logged in!')
    } else {
      window.location = `${firesync.host}/auth/google`
    }
  })
```

Once we're logged in we can create a new collaborative document:

```ts
firesync.createDoc('foo')
  .then(() => { /* ... */ })
```

We can then subscribe to this document, and bind to a [Quill](https://github.com/quilljs/quill) rich text editor:

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

## Examples

## Documentation

## How does this compare to X?

* E.g. y-websockets, hocuspocus, y-redis, etc

## Feedback

## License

...
