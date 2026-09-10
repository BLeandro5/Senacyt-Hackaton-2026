import { useEffect, useState } from 'react'
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  Building2,
  Cloud,
  CloudOff,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react'

import { readStored } from '../data/visitStore'

type StoredUser = {
  id?: number
  username?: string
  name: string
  role?: string
}

function SupervisorLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const user = readStored<StoredUser | null>('demo-user', null)

  const [online, setOnline] = useState(navigator.onLine)
  const [mobileMenuKey, setMobileMenuKey] = useState<string | null>(null)
  const mobileMenuOpen = mobileMenuKey === location.key

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine)

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (!user?.name) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'supervisor') {
    return <Navigate to={user.role === 'field' ? '/home' : '/login'} replace />
  }

  const logout = () => {
    localStorage.removeItem('demo-user')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-slate-950">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div>
            <p className="font-bold tracking-tight text-[#0B5ED7]">
              PHILIPS
            </p>

            <p className="text-[10px] text-slate-400">
              Supervisor Intelligence
            </p>
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Cerrar navegación' : 'Abrir navegación'}
            aria-expanded={mobileMenuOpen}
            aria-controls="supervisor-mobile-nav"
            onClick={() => setMobileMenuKey(mobileMenuOpen ? null : location.key)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav id="supervisor-mobile-nav" aria-label="Navegación del supervisor" className="mobile-menu-enter space-y-1 border-t border-slate-100 px-4 py-3" onClick={() => setMobileMenuKey(null)} onKeyDown={event => { if (event.key === 'Escape') setMobileMenuKey(null) }}>
            <SupervisorMobileLink
              to="/supervisor"
              icon={<LayoutDashboard size={18} />}
              end
            >
              Resumen
            </SupervisorMobileLink>

            <SupervisorMobileLink
              to="/supervisor/hospitals"
              icon={<Building2 size={18} />}
            >
              Hospitales
            </SupervisorMobileLink>

            <SupervisorMobileLink
              to="/supervisor/review"
              icon={<ShieldCheck size={18} />}
            >
              Por revisar
            </SupervisorMobileLink>
            <div className="border-t border-slate-100 px-3 pt-3 text-sm">
              <p className="font-semibold">{user.name}</p>
              <p role="status" className={online ? 'text-emerald-700' : 'text-amber-700'}>{online ? 'En línea' : 'Sin conexión'}</p>
              <button onClick={logout} className="mt-2 flex min-h-11 items-center gap-2"><LogOut size={18} />Cerrar sesión</button>
            </div>
          </nav>
        )}
      </header>

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-100 px-7 py-7">
            <p className="text-xl font-bold tracking-tight text-[#0B5ED7]">
              PHILIPS
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Installed Base Intelligence
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
              <ShieldCheck size={14} />
              Supervisor
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Navegación
            </p>

            <SupervisorNavLink
              to="/supervisor"
              icon={<LayoutDashboard size={19} />}
              end
            >
              Resumen
            </SupervisorNavLink>

            <SupervisorNavLink
              to="/supervisor/hospitals"
              icon={<Building2 size={19} />}
            >
              Hospitales
            </SupervisorNavLink>

            <SupervisorNavLink
              to="/supervisor/review"
              icon={<ShieldCheck size={19} />}
            >
              Por revisar
            </SupervisorNavLink>
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="mb-3 rounded-2xl bg-slate-50 p-4">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user.name}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Supervisor
              </p>

              <div
                className={`mt-3 flex items-center gap-2 text-xs font-medium ${
                  online ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {online ? <Cloud size={14} /> : <CloudOff size={14} />}
                {online ? 'En línea' : 'Sin conexión'}
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          {!online && (
            <div role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
              Estás sin conexión. La información disponible corresponde a los
              datos almacenados en este dispositivo.
            </div>
          )}

          <div className="page-enter" key={location.pathname}><Outlet /></div>
        </div>
      </div>
    </div>
  )
}

function SupervisorNavLink({
  to,
  icon,
  children,
  end = false,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
          isActive
            ? 'bg-blue-50 text-[#0B5ED7]'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}

function SupervisorMobileLink({
  to,
  icon,
  children,
  end = false,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
          isActive
            ? 'bg-blue-50 text-[#0B5ED7]'
            : 'text-slate-600'
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}

export default SupervisorLayout
