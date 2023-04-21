import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Editor from './Editor'

const router = createBrowserRouter([
  {
    path: 'docs/:docKey',
    element: <Editor />
  }
])

export default function App() {
  return <RouterProvider router={router} />
}
