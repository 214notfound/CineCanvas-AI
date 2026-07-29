import { createBrowserRouter } from 'react-router-dom'
import AnalyzePage from '@/pages/AnalyzePage'
import CompareDebugPage from '@/pages/CompareDebugPage'
import Home from '@/pages/Home'
import LearnLabPage from '@/pages/learn/LearnLabPage'
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
  {
    path: '/learn/lab',
    element: <LearnLabPage />,
  },
  {
    path: '/debug/compare',
    element: <CompareDebugPage />,
  },
])
