import { createBrowserRouter } from 'react-router-dom'
import AnalyzePage from '@/pages/AnalyzePage'
import Home from '@/pages/Home'
import WorkspacePage from '@/pages/WorkspacePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/analyze',
    element: <AnalyzePage />,
  },
  {
    path: '/workspace',
    element: <WorkspacePage />,
  },
])
