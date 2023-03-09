import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import LoginWrapper from './LoginWrapper'
import DocsList from './DocsList'
import Editor from './Editor'

const router = createBrowserRouter([
  {
    path: '/',
    element: <DocsList />
  },
  {
    path: 'docs/:docKey',
    element: <Editor />
  }
])

export default function App() {
  return (
    <LoginWrapper>
      <RouterProvider router={router} />
    </LoginWrapper>
  )
}
