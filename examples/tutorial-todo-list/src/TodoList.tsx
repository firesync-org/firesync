import { useState } from "react";
import "bootstrap/dist/css/bootstrap.css";

import { Y } from "@firesync/client";
import { useSyncedStore } from "@syncedstore/react";
import { syncedStore } from "@syncedstore/core";
import { MappedTypeDescription } from "@syncedstore/core/types/doc";
import { useReactive } from "@reactivedata/react";
import { uuidv4 } from "lib0/random";

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
  const newTodoList = (title: string) => {
    const doc = new Y.Doc();
    const store = syncedStore<TodoList>({ items: [], title: "text" }, doc);
    store.title.insert(0, title);
    todoLists.push({ todoList: store, id: uuidv4() });
    setNewTitle("");
  };

  return (
    <div className="container mt-4">
      <form
        onSubmit={(e) => {
          newTodoList(newTitle);
          e.preventDefault();
        }}
        className="mt-3"
      >
        <input
          type="text"
          className="form-control"
          placeholder="Add new todo list"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </form>
      <div className="row g-3">
        {todoLists.map(({ id, todoList }) => (
          <div className="col">
            <TodoListCard todoList={todoList} key={id} />
          </div>
        ))}
      </div>
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
    <div className="card mt-3">
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
