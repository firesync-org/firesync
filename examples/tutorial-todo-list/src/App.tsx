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

export default function App() {
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
