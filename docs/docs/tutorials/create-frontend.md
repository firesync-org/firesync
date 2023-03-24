---
sidebar_position: 1
---

# Create Todo App

:::tip Yjs

FireSync is built on [Yjs](https://github.com/yjs/yjs), which is a protocol for handling concurrent and conflicting updates to the same data. A Yjs `Doc` is the fundamental building block of FireSync, and a `Doc` can store arbitrary array, maps and rich-text data. E.g.

```ts
const doc = new Y.Doc()

// Text editing
const text = doc.getText('text')
text.insert(0, 'hello world')

// Nested maps and arrays
const ymap = doc.getMap('map')
const array = new Y.Array()
array.insert(0, ['apple', 'banana'])
ymap.set('foo', array)
ymap.get('foo').get(1) // 'banana'
```

Each `Doc` can be shared with different FireSync users and edited collaboratively. You will need to consider how to split up your application into suitable `Doc`s, which will generally map to the conceptual 'documents', 'projects' or whatever things that your app shares between users.

For our todo example, each todo list will be one `Doc`, stored as an array of maps with the shape:

```ts
[
  {
    description: 'Buy Food',
    done: true
  },
  // ...
]
```

:::

We'll start by putting together a basic React todo app, using Yjs as our data store. This will just be a client side app to start with, but in the next sections we will hook it up to the FireSync server to create a real-time collaborative app.

## Create React App

To start with, let's create a template React app, using TypeScript:

```sh
$ npx create-react-app firesync-todo-list --template typscript
```

This should create a `firesync-todo-list` directory for you, with everything you need for a React app. `cd` into this directory, and run the development server:

```sh
$ cd firesync-todo-list
$ npm run start
```

Your browser should open to [http://localhost:3000](http://localhost:3000) and you will be greeted with the welcome to React screen.

## Install Dependencies

Let's install a couple of dependencies that we'll build our todo using:

* [FireSync Client](../category/firesync-client) to set us up with [Yjs](https://github.com/yjs/yjs) for our underlying data store, which in later sections we will connect to the FireSync server.
* [SyncedStore](https://syncedstore.org/docs/) to cleanly interact with Yjs via React.
* [Bootstrap](https://getbootstrap.com/) for some easy styling

```sh
$ npm install --save @firesync/client @syncedstore/core @syncedstore/react bootstrap
```

## Create Todo App

Add `src/TodoList.tsx` with the following code: 

```tsx title=src/TodoList.tsx
import { useState } from "react";
import 'bootstrap/dist/css/bootstrap.css';

import { Y } from "@firesync/client";
import { useSyncedStore } from "@syncedstore/react";
import { syncedStore } from "@syncedstore/core";

type Item = {
  description: string;
  done: boolean;
};

const doc = new Y.Doc();
const store = syncedStore({ todos: [] as Item[] }, doc);

export default function TodoList() {
  const { todos } = useSyncedStore(store);

  const [newDescription, setNewDescription] = useState("");

  const addTodo = (description: string) => {
    todos.push({ done: false, description });
    setNewDescription("");
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="card col-md-6 col">
          <div className="card-body">
            <h1>Todo List</h1>
            {todos.map((item, index) => {
              return (
                <div key={index} className="form-check">
                  <label>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={item.done}
                      onChange={(e) => (item.done = e.target.checked)}
                      id={`todo-${index}`}
                    />
                    <label
                      htmlFor={`todo-${index}`}
                      className="form-check-label"
                      style={{
                        textDecoration: item.done ? "line-through" : undefined,
                      }}
                    >
                      {item.description}
                    </label>
                  </label>
                </div>
              );
            })}
            <form
              onSubmit={(e) => {
                addTodo(newDescription);
                e.preventDefault();
              }}
              className="mt-3"
            >
              <input
                type="text"
                className="form-control"
                placeholder="Add new todo item"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Also update `src/App.tsx` to load our todo list:

```ts title=src/App.tsx
import TodoList from "./TodoList";

export default function App() {
  return <TodoList />
}
```

This set up a basic todo list using Yjs as our underlying data store. At the moment the Yjs doc is only store on the client side, but in the next sections we will set it up to sync in real-time to the FireSync server.
