import { createBrowserRouter } from 'react-router-dom'
import AnalyzePage from '@/pages/AnalyzePage'
import CompareDebugPage from '@/pages/CompareDebugPage'
import Home from '@/pages/Home'
import LearnIndexPage from '@/pages/learn/LearnIndexPage'
import LearnLabPage from '@/pages/learn/LearnLabPage'
import LessonPage from '@/pages/learn/LessonPage'
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
    path: '/learn',
    element: <LearnIndexPage />,
  },
  {
    path: '/learn/lab',
    element: <LearnLabPage />,
  },
  {
    path: '/learn/lessons/:id',
    element: <LessonPage />,
  },
  {
    path: '/debug/compare',
    element: <CompareDebugPage />,
  },
])
