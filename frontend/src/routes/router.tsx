import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppLayout, RouteError } from '../components/AppLayout'
import LoginPage from '../pages/Login/LoginPage'
import RegisterPage from '../pages/Register/RegisterPage'
import HomePage from '../pages/Home/HomePage'
import NewVisitPage from '../pages/NewVisit/NewVisitPage'
import CapturePage from '../pages/Capture/CapturePage'
import ReviewPage from '../pages/Review/ReviewPage'
import MatchPage from '../pages/Match/MatchPage'
import SuccessPage from '../pages/Success/SuccessPage'
import VisitsPage from '../pages/Visits/VisitsPage'
import VisitDetailPage from '../pages/VisitDetail/VisitDetailPage'
import QuickCapturePage from '../pages/QuickCapture/QuickCapturePage'
import SettingsPage from '../pages/Settings/SettingsPage'
import HospitalsPage from '../pages/Hospitals/HospitalsPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import InstalledBaseMapPage from '../pages/Map/InstalledBaseMapPage'

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/capture/quick', element: <QuickCapturePage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/map', element: <InstalledBaseMapPage /> },
      { path: '/hospitals', element: <HospitalsPage /> },
      { path: '/hospitals/:hospitalId', element: <HospitalsPage /> },
      { path: '/visits', element: <VisitsPage /> },
      { path: '/visits/new', element: <NewVisitPage /> },
      { path: '/visits/new/capture', element: <CapturePage /> },
      { path: '/visits/new/review', element: <ReviewPage /> },
      { path: '/visits/new/match', element: <MatchPage /> },
      { path: '/visits/new/success', element: <SuccessPage /> },
      { path: '/visits/:visitId', element: <VisitDetailPage /> },
    ],
  },
  { path: '/supervisor/*', element: <Navigate to="/home" replace /> },
  { path: '*', element: <RouteError /> },
])
