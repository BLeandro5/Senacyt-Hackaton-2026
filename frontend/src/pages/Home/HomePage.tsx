import { useVisits } from '../../data/useVisits'
import ObservationExplorer from '../../components/ObservationExplorer'
import { readStored, displayDate, resumePath, clearObservation } from '../../data/visitStore'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Building2, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Cloud, CloudOff, Clock3, Lightbulb, Monitor, Plus, ScanLine, Sparkles, Wifi } from 'lucide-react'

type DemoUser = {
  name: string
  role?: string
}

type CurrentVisit = {
  hospitalId?: string
  hospitalName: string
  region?: string
  area?: string
  startedAt?: string
}

function HomePage() {
  const navigate = useNavigate()

  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const [user] = useState<DemoUser>(() => readStored('demo-user', { name: 'Colaborador' }))
  const [currentVisit, setCurrentVisit] = useState<CurrentVisit | null>(() => readStored('current-visit', null))
  const { visits: allVisits, error: storageError } = useVisits(false)
  const recentVisits = allVisits.slice(0, 4).map(v => ({ ...v, date: displayDate(v.date), equipmentCount: v.observations.reduce((n,o) => n + o.equipment.length, 0) }))
  const todayVisits = allVisits.filter(v => v.completedAt.includes('T') && new Date(v.completedAt).toDateString() === new Date().toDateString())
  const pendingCount = allVisits.filter(v => v.syncStatus === 'pending').length
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const firstName = useMemo(() => {
    return user.name?.split(' ')[0] || 'Ana'
  }, [user.name])

  const todayEquipment = todayVisits.reduce((n,v) => n + v.observations.reduce((m,o) => m + o.equipment.length, 0), 0)

  const discardCurrentVisit = () => {
    if (!window.confirm('¿Descartar esta visita y su borrador? Las visitas finalizadas se conservan.')) return
    clearObservation()
    localStorage.removeItem('current-visit')
    localStorage.removeItem('current-observation')
    localStorage.removeItem('current-structured-record')
    localStorage.removeItem('match-result')
    setCurrentVisit(null)
  }

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-slate-950">
      {/* Desktop header */}


      <main className="mx-auto max-w-[1380px] px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-10 lg:pt-9">
        {storageError && <p role="alert" className="storage-error">{storageError}</p>}
        <button className="mb-5 rounded-xl bg-blue-700 px-5 py-3 text-white" onClick={() => navigate('/capture/quick')}>Captura rápida</button>
        <button className="mb-5 ml-3 rounded-xl border border-blue-200 px-5 py-3" onClick={() => navigate('/settings')}>Configuración</button>
        <a className="mb-5 ml-3 inline-block rounded-xl border border-blue-200 px-5 py-3 text-blue-700" href="#observaciones-generales">Ver observaciones generales</a>
        {/* Greeting */}
        <section className="mb-6">
          <p className="text-sm font-semibold text-[#0B5ED7]">
            Buen día
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Hola, {firstName}
          </h1>

          <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
            ¿Listo para tu próxima visita?
          </p>
        </section>

        {/* Top desktop grid */}
        <section className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Main CTA */}
          <button
            onClick={() => navigate('/visits/new')}
            className="group relative min-h-[175px] overflow-hidden rounded-[26px] text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl lg:col-span-8 lg:min-h-[210px]"
            style={{
              background:
                'linear-gradient(115deg, #4A0982 0%, #351D8E 24%, #19379D 50%, #0455A8 73%, #208E94 100%)',
            }}
          >
            {/* Decoration */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />

              <div className="absolute -right-5 -top-4 h-40 w-40 rounded-full bg-white/[0.04]" />

              <ScanLine
                size={65}
                strokeWidth={1.2}
                className="absolute right-[34%] top-[35%] hidden text-white/[0.10] lg:block"
              />

              <Monitor
                size={52}
                strokeWidth={1.2}
                className="absolute right-[23%] top-[39%] hidden text-white/[0.10] lg:block"
              />

              <Activity
                size={50}
                strokeWidth={1.2}
                className="absolute right-[13%] top-[39%] hidden text-white/[0.10] lg:block"
              />
            </div>

            <div className="relative flex h-full items-center justify-between gap-5 p-6 sm:p-7 lg:p-8">
              <div>
                <div className="mb-5 flex items-center gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Plus size={24} />
                  </span>

                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
                    <Sparkles size={13} />
                    Captura inteligente
                  </span>
                </div>

                <h2 className="text-2xl font-semibold sm:text-3xl">
                  Nueva visita
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-white/80 sm:text-base">
                  Selecciona un hospital y registra lo que observas.
                </p>
              </div>

              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition group-hover:translate-x-1 group-hover:bg-white/20 sm:h-14 sm:w-14">
                <ChevronRight size={25} />
              </span>
            </div>
          </button>

          {/* Today's summary */}
          <div className="hidden rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4 lg:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
                  <CalendarDays size={19} />
                </div>

                <h2 className="font-semibold text-slate-950">
                  Resumen de hoy
                </h2>
              </div>

              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('es-PA', { day: 'numeric', month: 'long' })}
              </span>
            </div>

            <div className="mt-7 grid grid-cols-3 divide-x divide-slate-100">
              <SummaryMetric
                value={todayVisits.length}
                label="Visitas"
                icon={<ClipboardList size={17} />}
              />

              <SummaryMetric
                value={todayEquipment}
                label="Equipos"
                icon={<Monitor size={17} />}
              />

              <SummaryMetric
                value={todayVisits.filter(v => v.syncStatus === 'pending').length}
                label="Pendientes"
                icon={<CheckCircle2 size={17} />}
                success
              />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-center text-xs italic leading-5 text-slate-400">
                La información capturada hoy está disponible para consulta.
              </p>
            </div>
          </div>
        </section>

        <ObservationExplorer />
        {/* Main content */}
        <section className="mt-5 grid gap-5 lg:grid-cols-12">
          {/* Recent visits */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Visitas recientes
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Actividad reciente · incluye visitas de ejemplo
                </p>
              </div>

              <button
                onClick={() => navigate('/visits')}
                className="flex items-center gap-1 text-sm font-semibold text-[#0B5ED7] transition hover:gap-2"
              >
                Ver todas
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              {recentVisits.length === 0 && <p className="p-5 text-sm text-slate-500">Aún no hay visitas. Comienza una nueva visita para registrar equipos.</p>}
              {recentVisits.map((visit, index) => (
                <button
                  key={visit.id}
                  onClick={() => navigate(`/visits/${visit.id}`)}
                  className={`group flex w-full items-center gap-4 bg-white px-4 py-4 text-left transition hover:bg-slate-50 ${
                    index !== recentVisits.length - 1
                      ? 'border-b border-slate-100'
                      : ''
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#233EA5] text-white">
                    <ClipboardList size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {visit.hospital}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {visit.area} · {visit.date}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {visit.equipmentCount}
                    </p>

                    <p className="text-[11px] text-slate-400">
                      equipos
                    </p>
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0B5ED7]"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Continue visit */}
          <div className="hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3 lg:block">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Clock3 size={19} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-950">
                  Continuar visita
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {currentVisit
                    ? 'Tienes una visita en progreso'
                    : 'No tienes visitas pendientes'}
                </p>
              </div>
            </div>

            {currentVisit ? (
              <>
                <button
                  onClick={() => navigate(resumePath())}
                  className="group mt-5 w-full rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B5ED7] shadow-sm">
                      <Building2 size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {currentVisit.hospitalName}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {currentVisit.area || 'Área no especificada'}
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="text-[#0B5ED7] transition group-hover:translate-x-1"
                    />
                  </div>
                </button>

                <button
                  onClick={() => navigate(resumePath())}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B5ED7] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0954C4]"
                >
                  Continuar visita
                  <ChevronRight size={17} />
                </button>

                <button
                  onClick={discardCurrentVisit}
                  className="mt-2 w-full py-2 text-xs font-medium text-slate-400 transition hover:text-rose-500"
                >
                  Descartar borrador
                </button>
              </>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-6 text-center">
                <CheckCircle2
                  size={26}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Cuando dejes una visita abierta podrás continuarla desde aquí.
                </p>
              </div>
            )}
          </div>

          {/* Sync */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isOnline && pendingCount === 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {isOnline ? <Cloud size={19} /> : <CloudOff size={19} />}
              </div>

              <div>
                <h2 className="font-semibold text-slate-950">
                  Sincronización
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Estado de tus registros
                </p>
              </div>
            </div>

            <div
              className={`mt-5 rounded-2xl p-4 ${
                isOnline && pendingCount === 0 ? 'bg-emerald-50' : 'bg-amber-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    isOnline && pendingCount === 0
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {isOnline ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <CloudOff size={18} />
                  )}
                </div>

                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isOnline && pendingCount === 0 ? 'text-emerald-950' : 'text-amber-950'
                    }`}
                  >
                    {isOnline
                      ? `${pendingCount} visitas pendientes`
                      : 'Trabajando sin conexión'}
                  </p>

                  <p
                    className={`mt-0.5 text-xs ${
                      isOnline && pendingCount === 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {isOnline
                      ? 'Visitas confirmadas en SQLite local.'
                      : 'SQLite funciona sin Internet; mantén el backend iniciado.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-4">
              <div className="pr-4">
                <p className="text-[11px] text-slate-400">
                  Almacenamiento
                </p>

                <p className="mt-1 text-xs font-medium text-slate-700">
                  No disponible en el prototipo
                </p>
              </div>

              <div className="pl-4">
                <p className="text-[11px] text-slate-400">
                  Modo actual
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <Wifi size={13} />
                  {isOnline ? 'En línea' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile current visit */}
        {currentVisit && (
          <section className="mt-5 lg:hidden">
            <button
              onClick={() => navigate(resumePath())}
              className="flex w-full items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0B5ED7] shadow-sm">
                <Clock3 size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#0B5ED7]">
                  Visita en progreso
                </p>

                <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">
                  {currentVisit.hospitalName}
                </p>
              </div>

              <ChevronRight size={19} className="text-[#0B5ED7]" />
            </button>
          </section>
        )}

        {/* Desktop tip */}
        <section className="mt-5 hidden items-center justify-between gap-6 rounded-[22px] border border-blue-100 bg-blue-50 px-6 py-5 lg:flex">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B5ED7] shadow-sm">
              <Lightbulb size={20} />
            </div>

            <div>
              <p className="text-sm font-semibold text-[#0B5ED7]">
                Consejo para tus visitas
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Usa la captura por voz para registrar observaciones mientras te
                desplazas por el hospital.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Sparkles size={14} />
            Captura estructurada y asistencia inteligente
          </div>
        </section>
      </main>

      {/* Mobile navigation */}

    </div>
  )
}

function SummaryMetric({
  value,
  label,
  icon,
  success = false,
}: {
  value: number
  label: string
  icon: React.ReactNode
  success?: boolean
}) {
  return (
    <div className="px-3 text-center">
      <div
        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ${
          success
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-blue-50 text-[#0B5ED7]'
        }`}
      >
        {icon}
      </div>

      <p className="mt-2 text-xl font-semibold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-slate-400">
        {label}
      </p>
    </div>
  )
}

export default HomePage
