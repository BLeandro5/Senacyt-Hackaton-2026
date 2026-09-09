import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Cloud,
  CloudOff,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'

type SyncStatus = 'synced' | 'pending'

type Visit = {
  id: string
  hospital: string
  area: string
  date: string
  equipmentCount: number
  observationCount: number
  syncStatus: SyncStatus
}

const demoVisits: Visit[] = [
  {
    id: 'VIS-001',
    hospital: 'Hospital Santo Tomás',
    area: 'Imagenología',
    date: '9 sep 2026 · 9:42 a. m.',
    equipmentCount: 3,
    observationCount: 1,
    syncStatus: 'synced',
  },
  {
    id: 'VIS-002',
    hospital: 'Hospital Nacional',
    area: 'Radiología',
    date: '8 sep 2026 · 3:18 p. m.',
    equipmentCount: 5,
    observationCount: 2,
    syncStatus: 'synced',
  },
  {
    id: 'VIS-003',
    hospital: 'Hospital Punta Pacífica',
    area: 'Urgencias',
    date: '8 sep 2026 · 11:05 a. m.',
    equipmentCount: 2,
    observationCount: 1,
    syncStatus: 'pending',
  },
]

function VisitsPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'synced' | 'pending'>('all')

  const visits = useMemo(() => {
    let result = demoVisits

    const query = search.trim().toLowerCase()

    if (query) {
      result = result.filter(
        (visit) =>
          visit.hospital.toLowerCase().includes(query) ||
          visit.area.toLowerCase().includes(query),
      )
    }

    if (filter !== 'all') {
      result = result.filter((visit) => visit.syncStatus === filter)
    }

    return result
  }, [search, filter])

  const pendingCount = demoVisits.filter(
    (visit) => visit.syncStatus === 'pending',
  ).length

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
              aria-label="Volver al inicio"
            >
              <ChevronLeft size={22} />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0B5ED7]">
                Philips
              </p>

              <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Mis visitas
              </h1>
            </div>
          </div>

          <button
            onClick={() => navigate('/visits/new')}
            className="hidden items-center gap-2 rounded-xl bg-[#0B5ED7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0954C4] sm:flex"
          >
            <Plus size={18} />
            Nueva visita
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
        {/* Intro */}
        <section className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Historial de visitas
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Consulta las visitas realizadas y revisa qué información está
            pendiente de sincronización.
          </p>
        </section>

        {/* Summary */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
              <CalendarDays size={20} />
            </div>

            <p className="text-2xl font-semibold text-slate-950">
              {demoVisits.length}
            </p>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Visitas registradas
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CircleCheck size={20} />
            </div>

            <p className="text-2xl font-semibold text-slate-950">
              {
                demoVisits.filter((visit) => visit.syncStatus === 'synced')
                  .length
              }
            </p>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Sincronizadas
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock3 size={20} />
            </div>

            <p className="text-2xl font-semibold text-slate-950">
              {pendingCount}
            </p>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Pendientes
            </p>
          </div>
        </section>

        {/* Search + filters */}
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar hospital o área..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B5ED7] focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="mr-1 hidden text-slate-400 sm:block">
                <SlidersHorizontal size={18} />
              </div>

              <FilterButton
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                Todas
              </FilterButton>

              <FilterButton
                active={filter === 'synced'}
                onClick={() => setFilter('synced')}
              >
                Sincronizadas
              </FilterButton>

              <FilterButton
                active={filter === 'pending'}
                onClick={() => setFilter('pending')}
              >
                Pendientes
              </FilterButton>
            </div>
          </div>
        </section>

        {/* Visit list */}
        <section className="space-y-3">
          {visits.length > 0 ? (
            visits.map((visit) => (
              <button
                key={visit.id}
                onClick={() => navigate(`/visits/${visit.id}`)}
                className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0B5ED7]">
                    <Building2 size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-950 sm:text-lg">
                          {visit.hospital}
                        </h3>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 sm:text-sm">
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            {visit.area}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            {visit.date}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        size={20}
                        className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0B5ED7]"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {visit.equipmentCount}{' '}
                        {visit.equipmentCount === 1 ? 'equipo' : 'equipos'}
                      </span>

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {visit.observationCount}{' '}
                        {visit.observationCount === 1
                          ? 'observación'
                          : 'observaciones'}
                      </span>

                      <SyncBadge status={visit.syncStatus} />
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <Search className="mx-auto mb-4 text-slate-300" size={36} />

              <h3 className="font-semibold text-slate-900">
                No encontramos visitas
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                Prueba con otro hospital, área o cambia los filtros.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Mobile navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-6 py-2 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 items-end">
          <button
            onClick={() => navigate('/home')}
            className="flex flex-col items-center gap-1 py-1 text-xs font-medium text-slate-400"
          >
            <Building2 size={20} />
            Inicio
          </button>

          <button
            onClick={() => navigate('/visits/new')}
            className="flex flex-col items-center gap-1 text-xs font-medium text-[#0B5ED7]"
          >
            <span
              className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{
                background:
                  'linear-gradient(115deg, #4A0982 0%, #351D8E 24%, #19379D 50%, #0455A8 73%, #208E94 100%)',
              }}
            >
              <Plus size={23} />
            </span>

            <span className="-mt-2">Nueva visita</span>
          </button>

          <button className="flex flex-col items-center gap-1 py-1 text-xs font-semibold text-[#0B5ED7]">
            <CalendarDays size={20} />
            Mis visitas
          </button>
        </div>
      </nav>
    </div>
  )
}

type FilterButtonProps = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function FilterButton({ active, onClick, children }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
        active
          ? 'bg-[#0B5ED7] text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}

function SyncBadge({ status }: { status: SyncStatus }) {
  if (status === 'synced') {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Cloud size={13} />
        Sincronizada
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <CloudOff size={13} />
      Pendiente
    </span>
  )
}

export default VisitsPage