import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CalendarDays, ChevronRight, CircleCheck, Clock3, Cloud, CloudOff, MapPin, Search, SlidersHorizontal } from 'lucide-react'

type SyncStatus = 'synced' | 'pending'

import { useVisits } from '../../data/useVisits'
import { displayDate } from '../../data/visitStore'
function VisitsPage() {
  const navigate = useNavigate()

  const [includeExamples, setIncludeExamples] = useState(false)
  const { visits: storedVisits, error: storageError } = useVisits(includeExamples)
  const demoVisits = useMemo(() => storedVisits.map(v => ({ ...v, date: displayDate(v.date), equipmentCount: v.observations.reduce((n, o) => n + o.equipment.length, 0), observationCount: v.observations.length })), [storedVisits])
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
  }, [search, filter, demoVisits])

  const pendingCount = demoVisits.filter(
    (visit) => visit.syncStatus === 'pending',
  ).length

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-slate-900">
      {/* Header */}


      <main className="mx-auto max-w-[1380px] px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
        {storageError && <p role="alert" className="storage-error">{storageError}</p>}
        {/* Intro */}
        <section className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Historial de visitas
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Consulta las visitas realizadas y revisa qué información está
            pendiente de guardar.
          </p>
        </section>

        {/* Summary */}
        <label className="mb-5 flex w-fit cursor-pointer items-center gap-3 text-sm text-slate-600"><input type="checkbox" checked={includeExamples} onChange={e => setIncludeExamples(e.target.checked)} />Mostrar visitas de ejemplo (datos simulados)</label>
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
              Guardadas
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
                aria-label="Buscar hospital o Área"
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
                Guardadas
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
        <section className="grid items-start gap-4 lg:grid-cols-2">
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
                {demoVisits.length ? 'Prueba con otro hospital, área o cambia los filtros.' : 'Todavía no tienes visitas finalizadas. Comienza una nueva visita desde la navegación.'}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Mobile navigation */}

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
      aria-pressed={active}
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
        Guardada
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
