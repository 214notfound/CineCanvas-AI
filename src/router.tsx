import { createBrowserRouter } from 'react-router-dom'
import Home from '@/pages/Home'
import WorkspacePage from '@/pages/WorkspacePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/workspace',
    element: <WorkspacePage />,
  },
])
