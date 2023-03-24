---
sidebar_position: 5
---

# Collaborating with FireSync

Now that we've got our todo list app, and are logged in with a FireSync user, we will create a doc in the FireSync backend that we can connect our client Yjs document to, which will hook up real-time collaboration end to end!

## Creating a Document

You can create a document from the client with `firesync.createDoc('my-doc-key')`. The doc key is unique reference to the document and should consist only of letters, numbers and the `-` and `/` characters.

Let's import our `firesync` client we created in the previous section, and add in a call to `firesync.createDoc` when our `TodoList` component loads, to ensure that the document exists:

```ts title=src/TodoList.tsx
import { useEffect, useState } from "react"; // <- Updated to add useEffect
import { firesync } from "./firesync"; // <- Add this in
// Rest of imports...

export default function TodoList() {
  const DOC_KEY = "todo-list-example"

  useEffect(() => {
    firesync.createDoc(DOC_KEY)
  }, []);

  // Rest of TodoList component
}
```

:::warning TODO

`createDoc` is returning a server error here when called again with the same doc key. It should implicitly succeed if we're just trying to create a doc that already exists and is owned by the same user.

:::

## Subscribing to a Document

We're now ready to add in the connection between the client side Yjs doc and the doc on the FireSync server, which will mean that any data entered on the client is synced to the server, and any data that gets to the server from other clients will be immediately synced to our client.

The method for this is `firesync.connection.subscribe('my-doc-key')`. This tells the FireSync client to start syncing any changes for this document to and from the server. It can optionally take an existing Yjs doc, and will return the Yjs doc which will be kept in sync with the server.

Update our `useEffect` at the top of the `TodoList` compoment to subscribe our Yjs doc to the FireSync server:

```ts title=src/TodoList.tsx
import { useEffect, useState } from "react"; // <- Updated to add useEffect
import { firesync } from "./firesync"; // <- Add this in
// Rest of imports...

export default function TodoList() {
  const DOC_KEY = "todo-list-example"

  const [created, setCreated] = useState(false)
  useEffect(() => {
    firesync.createDoc(DOC_KEY).then(() => setCreated(true))
  }, []);

  useEffect(() => {
    if (created) {
      firesync.connection.subscribe(DOC_KEY, doc)
      // Stop syncing changes when component unmounts
      return () => firesync.connection.unsubscribe(DOC_KEY)
    }
  })

  // Rest of TodoList component
}
```

:::tip Everything is working!

Any changes you make to your todo list will now be synced to the FireSync server and will now persist between browser refreshes. If you open the app in multiple tabs, you should also see changes made in one tab immediately appear in the other!

:::
