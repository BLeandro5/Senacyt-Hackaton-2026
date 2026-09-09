import { createBrowserRouter } from 'react-router-dom'

import LoginPage from '../pages/Login/LoginPage'
import HomePage from '../pages/Home/HomePage'
import NewVisitPage from '../pages/NewVisit/NewVisitPage'
import CapturePage from '../pages/Capture/CapturePage'
import ReviewPage from '../pages/Review/ReviewPage'
import MatchPage from '../pages/Match/MatchPage'
import SuccessPage from '../pages/Success/SuccessPage'
import VisitsPage from '../pages/Visits/VisitsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/home',
    element: <HomePage />,
  },
  {
    path: '/visits',
    element: <VisitsPage />,
  },
  {
    path: '/visits/new',
    element: <NewVisitPage />,
  },
  {
    path: '/visits/new/capture',
    element: <CapturePage />,
  },
  {
    path: '/visits/new/review',
    element: <ReviewPage />,
  },
  {
    path: '/visits/new/match',
    element: <MatchPage />,
  },
  {
    path: '/visits/new/success',
    element: <SuccessPage />,
  },
])