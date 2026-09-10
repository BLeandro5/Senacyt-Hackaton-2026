import { createBrowserRouter } from 'react-router-dom'

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
import InstalledBasePage from '../pages/InstalledBase/InstalledBasePage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import MapPage from '../pages/Map/MapPage'
import InstalledBaseMapPage from '../pages/Map/InstalledBaseMapPage'
import Customer360Page from '../pages/Customer360/Customer360Page'
import HospitalsPage from '../pages/Hospitals/HospitalsPage'
import AnalyticsPage from '../pages/Analytics/AnalyticsPage'
import OpportunitiesPage from '../pages/Opportunities/OpportunitiesPage'

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
      { path: '/hospitals', element: <HospitalsPage /> },
      { path: '/hospitals/:hospitalId', element: <Customer360Page /> },
      { path: '/equipment/:assetId', element: <InstalledBasePage /> },
      { path: '/review', element: <InstalledBasePage /> },
      { path: '/opportunities', element: <OpportunitiesPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/map', element: <InstalledBaseMapPage /> },
      { path: '/map/activity', element: <MapPage /> },
      { path: '/map/catalog', element: <InstalledBaseMapPage /> },
      { path: '/visits', element: <VisitsPage /> },
      { path: '/visits/new', element: <NewVisitPage /> },
      { path: '/visits/new/capture', element: <CapturePage /> },
      { path: '/visits/new/review', element: <ReviewPage /> },
      { path: '/visits/new/match', element: <MatchPage /> },
      { path: '/visits/new/success', element: <SuccessPage /> },
      { path: '/visits/:visitId', element: <VisitDetailPage /> },
    ],
  },
  { path: '*', element: <RouteError /> },
])
