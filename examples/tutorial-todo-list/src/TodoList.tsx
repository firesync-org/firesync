import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.css";

import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

import { Y } from "@firesync/client";
import { useSyncedStore } from "@syncedstore/react";
import { syncedStore } from "@syncedstore/core";
import { MappedTypeDescription } from "@syncedstore/core/types/doc";
import { useReactive } from "@reactivedata/react";
import { uuidv4 } from "lib0/random";
import { firesync } from "./firesync";

type TodoList = {
  items: Array<{
    description: string;
    done: boolean;
  }>;
  title: "text";
};

const todoListsStore: Array<{
  todoList: MappedTypeDescription<TodoList>;
  id: string;
}> = [];

export default function TodoLists() {
  const todoLists = useReactive(todoListsStore);

  const [newTitle, setNewTitle] = useState("");
  const newTodoList = async (title: string) => {
    const id = uuidv4()
    const docKey = `todo-list/${id}`
    await firesync.createDoc(docKey)
    const ydoc = firesync.connection.subscribe(docKey)
    const store = syncedStore<TodoList>({ items: [], title: "text" }, ydoc);
    store.title.insert(0, title);
    todoLists.push({ todoList: store, id });
    setNewTitle("");
  };

  useEffect(() => {
    firesync.getUserRoles().then(({ data }) => {
      if (data) {
        const {
          user: { roles }
        } = data
        for (const role of roles) {
          const m = role.docKey.match(/^todo-list\/(.*)$/)
          if (m) {
            const id = m[1]
            const ydoc = firesync.connection.subscribe(role.docKey)
            const store = syncedStore<TodoList>({ items: [], title: "text" }, ydoc);
            todoLists.push({
              todoList: store,
              id
            })
          }
        }
      }
    })
  }, [])

  return (
    <div className="container mt-4">
      <form
        onSubmit={(e) => {
          newTodoList(newTitle);
          e.preventDefault();
        }}
        className="my-3"
      >
        <input
          type="text"
          className="form-control"
          placeholder="Add new todo list"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </form>
      <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}>
        <Masonry gutter="1rem">
          {todoLists.map(({ id, todoList }) => (
            <TodoListCard todoList={todoList} key={id} />
          ))}
        </Masonry>
      </ResponsiveMasonry>
    </div>
  );
}

export function TodoListCard({
  todoList: todoListStore,
}: {
  todoList: MappedTypeDescription<TodoList>;
}) {
  const todoList = useSyncedStore(todoListStore);

  const [newDescription, setNewDescription] = useState("");

  const addItem = (description: string) => {
    todoList.items.push({ done: false, description });
    setNewDescription("");
  };

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="h4">{todoList.title.toJSON()}</h2>
        {todoList.items.map((item, index) => {
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
            addItem(newDescription);
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
  );
}
