<p align="center">
⚠️ <em>This is an early preview and is not suitable for production use yet! Do no expect backwards compatibility with future versions yet.</em>
</p>

<p align="center">
If you think FireSync looks promising and would like to build on it, please email us at <a href="mailto:hello@firesync.live">hello@firesync.live</a> and we'd love to work with you to make sure FireSync fits your needs.
</p>

<h1 align="center">🔥 FireSync</h1>

FireSync is a complete backend for building a real-time collaborative app. You can focus on your application's core logic and UX, while FireSync takes care of:

- **🚀 Real-time collaboration via [Yjs](https://github.com/yjs/yjs)**
- **🗄️ [Postgres](https://www.postgresql.org/) backed storage**
- **🔓 Role based document permissions**
- **⚡ Webhook updates (in progress)**
- **👥 Teams, groups and anonymous access (coming soon)**
- **👀 Online indicators and user cursors (coming soon)**
- **🕒 Full browseable history of changes (coming soon)**
- **↩️ Rollback to previous versions (coming soon)**
- **💬 Comments (coming soon)**
- **💡 Suggesting mode and track changes (coming soon)**

All of this is available out of the box, or you can pick and choose which parts of FireSync you'd like to use.

## 📢 Stay up to date

[Sign up to our mailing list](https://cdn.forms-content.sg-form.com/b839aa5d-cbac-11ed-8fbd-bebc803b2bd5) to stay up to date as we develop FireSync in the open. We'll let you know about new features, our ideas and our future roadmap.

## Documentation

See [https://docs.firesync.dev/](https://docs.firesync.dev/) for a complete documentation guide. Or dive straight into:

- [Quick Start](https://docs.firesync.dev/quick-start) - One page quick start guide to get you going.
- [Guides](https://docs.firesync.dev/category/guides) - In depth guides on how to do specific things with FireSync.
- [Reference](https://docs.firesync.dev/category/reference) - Complete reference guides for the FireSync libraries with API specs.

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

## Authentication

Your backend should sign a [JSON Web Token (JWT)](https://en.wikipedia.org/wiki/JSON_Web_Token) for your client to pass to FireSync for access:

```js
import jwt from "jsonwebtoken";

const payload = {
  docs: {
    // Grant write access to the document called 'foo' and readonly access to 'bar'
    foo: "write",
    bar: "read",
  },
};

// Configure your secret via FS_JWT_AUTH_SECRET in firesync-server,
// or find it in your project settings for FireSync Cloud
const secret = "/B?E(H+KbPeShVmYq3t6w9zDC&F)J@Nc";

// Pass token to your client
const token = jwt.sign(payload, secret);
```

See the [Authentication Guide](https://docs.firesync.dev/guides/authentication) for more details

## Syncing Changes

If we pass our JWT from above into the FireSync client, we will be able subscribe to the document called 'foo', and any edits we make will be immediately synced to any other clients subscribed to 'foo':

```js
import FireSync from "@firesync/client";
const firesync = new FireSync({
  baseUrl: "http://localhost:5000", // The URL where firesync-server is running
  token: token, // Generated above
});

const doc = firesync.subscribeYDoc("foo");

// Get a real-time map that we can set key, value pairs in
const map = doc.getMap("bar");
map.on("update", () => {
  // Triggered on either local updates, or updates from other clients
  console.log("Map was updated: ", map.toJSON());
});

// Set some values locally that will be synced to all clients
map.set("name", "Bob");
map.set("age", 42);
map.set("awesome", true);
```

The `doc` returned by `firesync.subscribeYDoc` is a [Yjs](https://docs.firesync.dev/guides/yjs) doc that supports complex data structures with nested maps, lists and rich-text types.

## Collaborative Rich-Text Editing

You can bind the FireSync Yjs doc to various text editors to create a real-time collaborative rich-text editor. We'll use the [Quill] editor for our example below

```js
import { FireSync } from "@firesync/client";
import ReactQuill from "react-quill";
import { QuillBinding } from "y-quill";
import "react-quill/dist/quill.snow.css";

const firesync = new FireSync({
  // A JWT access token signed by your backend
  token: "<your-token>",
  // The host and port of your firesync-server instance
  baseUrl: "http://localhost:5000",
});

function CollaborativeQuillEditor() {
  const quillRef = (useRef < ReactQuill) | (null > null);

  // Doc key to sync with FireSync
  const docKey = "quill-example";

  useEffect(() => {
    // Subscribe to the document. Any local updates to this doc
    // will be sent to the server, and any updates from
    // other users will also get synced to this doc
    const doc = firesync.subscribeYDoc(docKey);

    // Bind the doc to the Quill editor
    const quill = quillRef.current.editor;
    const binding = new QuillBinding(doc.getText("t"), quill);

    // Tidy up everything on unmount
    return () => {
      firesync.unsubscribe(docKey);
      binding.destroy();
    };
  }, []);

  return <ReactQuill theme="snow" ref={quillRef} />;
}
```

See [Rich Text Collaboration](https://docs.firesync.dev/category/rich-text-collaboration) in our docs in for more examples.
