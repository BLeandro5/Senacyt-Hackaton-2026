import { createBrowserRouter } from 'react-router-dom'

import { AppLayout, RouteError } from '../components/AppLayout'
import SupervisorLayout from '../components/SupervisorLayout'
import LoginPage from '../pages/Login/LoginPage'
import HomePage from '../pages/Home/HomePage'
import NewVisitPage from '../pages/NewVisit/NewVisitPage'
import CapturePage from '../pages/Capture/CapturePage'
import ReviewPage from '../pages/Review/ReviewPage'
import MatchPage from '../pages/Match/MatchPage'
import SuccessPage from '../pages/Success/SuccessPage'
import VisitsPage from '../pages/Visits/VisitsPage'
import VisitDetailPage from '../pages/VisitDetail/VisitDetailPage'
import SupervisorDashboardPage from '../pages/SupervisorDashboard/SupervisorDashboardPage'
import HospitalsPage from '../pages/Hospitals/HospitalsPage'
import HospitalDetailPage from '../pages/HospitalDetail/HospitalDetailPage'
import ReviewQueuePage from '../pages/ReviewQueue/ReviewQueuePage'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/visits', element: <VisitsPage /> },
      { path: '/visits/new', element: <NewVisitPage /> },
      { path: '/visits/new/capture', element: <CapturePage /> },
      { path: '/visits/new/review', element: <ReviewPage /> },
      { path: '/visits/new/match', element: <MatchPage /> },
      { path: '/visits/new/success', element: <SuccessPage /> },
      { path: '/visits/:visitId', element: <VisitDetailPage /> },
    ],
  },
  {
    element: <SupervisorLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/supervisor', element: <SupervisorDashboardPage /> },
      { path: '/supervisor/hospitals', element: <HospitalsPage /> },
      { path: '/supervisor/hospitals/:hospitalId', element: <HospitalDetailPage /> },
      { path: '/supervisor/review', element: <ReviewQueuePage /> },
    ],
  },
  { path: '*', element: <RouteError /> },
])
