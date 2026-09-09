import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate, useRouteError } from 'react-router-dom'
import { Building2, ClipboardList, Cloud, CloudOff, LogOut, Plus } from 'lucide-react'
import { readStored, type Capture, type CurrentVisit, type Decision, type RecordDraft } from '../data/visitStore'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = readStored<{ name: string; role?: string } | null>('demo-user', null)
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  if (!user?.name) return <Navigate to="/login" replace />
  if (user.role === 'supervisor') return <Navigate to="/supervisor" replace />
  if (user.role !== 'field') return <Navigate to="/login" replace />
  const visit = readStored<CurrentVisit | null>('current-visit', null)
  const capture = readStored<Capture | null>('current-observation', null)
  const record = readStored<RecordDraft | null>('current-structured-record', null)
  const match = readStored<{ decisions: Decision[] } | null>('match-result', null)
  const step = location.pathname.split('/').at(-1)
  if (location.pathname.startsWith('/visits/new/')) {
    if (!visit?.hospitalName) return <Navigate to="/visits/new" replace />
    if (step !== 'capture' && !capture?.observation) return <Navigate to="/visits/new/capture" replace />
    if ((step === 'match' || step === 'success') && !record?.equipment?.length) return <Navigate to="/visits/new/review" replace />
    if (step === 'success' && !record!.equipment.every(e => match?.decisions?.some(d => d.equipmentId === e.id))) return <Navigate to="/visits/new/match" replace />
  }
  return <div className="app-shell">
    <a className="skip-link" href="#page-content">Saltar al contenido</a>
    <header className="app-header">
      <div className="header-inner">
        <Link to="/home" className="brand">PHILIPS<span>Installed Base Intelligence</span></Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          <NavLink to="/home"><Building2 size={18} />Inicio</NavLink>
          <NavLink to="/visits" end><ClipboardList size={18} />Mis visitas</NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <span role="status" aria-label={online ? 'En línea' : 'Sin conexión'} className={`connection ${online ? 'online' : 'offline'}`}>{online ? <Cloud size={15} /> : <CloudOff size={15} />}<span>{online ? 'En línea' : 'Sin conexión'}</span></span>
          <span className="hidden text-sm font-semibold lg:block">{user.name}</span>
          <button aria-label="Cerrar sesión" className="icon-button" onClick={() => { localStorage.removeItem('demo-user'); navigate('/login') }}><LogOut size={19} /></button>
        </div>
      </div>
    </header>
    {!online && <p className="offline-notice" role="status">Sin Internet. Puedes usar MedPsy y SQLite localmente si sus servicios siguen iniciados.</p>}
    <div id="page-content" className="page-enter" key={location.pathname}><Outlet /></div>
    <nav className="mobile-nav" aria-label="Navegación móvil">
      <NavLink to="/home"><Building2 size={21} />Inicio</NavLink>
      <NavLink to="/visits/new"><Plus size={23} />Nueva visita</NavLink>
      <NavLink to="/visits" end><ClipboardList size={21} />Mis visitas</NavLink>
    </nav>
  </div>
}

export function RouteError() {
  useRouteError()
  return <main className="mx-auto max-w-xl p-6"><section className="panel mt-12"><h1 className="text-2xl font-semibold">No pudimos abrir esta pantalla</h1><p className="my-4">Los datos guardados no se han eliminado. Vuelve al inicio e intenta continuar la visita.</p><a className="text-blue-700 underline" href="/home">Volver al inicio</a></section></main>
}
