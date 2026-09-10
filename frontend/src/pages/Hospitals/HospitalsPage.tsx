import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  MapPin,
  Monitor,
  Search,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'

import { hospitals } from '../../data/hospitals'
import { getVisits } from '../../data/visits'
import { displayDate, type Equipment } from '../../data/visitStore'

type HospitalSummary = {
  id: string
  name: string
  region: string
  city: string
  visitCount: number
  equipmentCount: number
  reviewCount: number
  lastVisit?: string
  pendingSyncCount: number
}

function HospitalsPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<
    'all' | 'activity' | 'review' | 'pending'
  >('all')

  const visits = useMemo(() => getVisits(), [])

  const hospitalSummaries = useMemo<HospitalSummary[]>(() => {
    return hospitals.map((hospital) => {
      const hospitalVisits = visits.filter(
        (visit) => visit.hospital === hospital.name,
      )

      const equipment = hospitalVisits.flatMap((visit) =>
        visit.observations.flatMap((observation) => observation.equipment),
      )

      const reviewCount = equipment.filter(needsReview).length

      const pendingSyncCount = hospitalVisits.filter(
        (visit) => visit.syncStatus === 'pending',
      ).length

      const latestVisit = [...hospitalVisits].sort((a, b) => {
        const first = parseDate(a.completedAt)
        const second = parseDate(b.completedAt)

        return second - first
      })[0]

      return {
        id: hospital.id,
        name: hospital.name,
        region: hospital.region,
        city: hospital.city,
        visitCount: hospitalVisits.length,
        equipmentCount: equipment.length,
        reviewCount,
        pendingSyncCount,
        lastVisit: latestVisit?.completedAt,
      }
    })
  }, [visits])

  const filteredHospitals = useMemo(() => {
    const query = search.trim().toLowerCase()

    return hospitalSummaries.filter((hospital) => {
      const matchesSearch =
        !query ||
        hospital.name.toLowerCase().includes(query) ||
        hospital.region.toLowerCase().includes(query) ||
        hospital.city.toLowerCase().includes(query)

      if (!matchesSearch) {
        return false
      }

      if (filter === 'activity') {
        return hospital.visitCount > 0
      }

      if (filter === 'review') {
        return hospital.reviewCount > 0
      }

      if (filter === 'pending') {
        return hospital.pendingSyncCount > 0
      }

      return true
    })
  }, [hospitalSummaries, search, filter])

  const hospitalsWithActivity = hospitalSummaries.filter(
    (hospital) => hospital.visitCount > 0,
  ).length

  const totalEquipment = hospitalSummaries.reduce(
    (total, hospital) => total + hospital.equipmentCount,
    0,
  )

  const totalReview = hospitalSummaries.reduce(
    (total, hospital) => total + hospital.reviewCount,
    0,
  )

  const totalPending = hospitalSummaries.reduce(
    (total, hospital) => total + hospital.pendingSyncCount,
    0,
  )

  return (
    <main className="px-4 pb-12 pt-7 sm:px-6 lg:px-8 lg:pt-9">
      <div className="mx-auto max-w-[1380px]">
        {/* Intro */}
        <section className="mb-7">
          <p className="text-sm font-semibold text-[#0B5ED7]">
            Base instalada
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Hospitales
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Consulta la actividad registrada por hospital y explora los equipos
            observados en cada cliente.
          </p>
        </section>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Building2 size={20} />}
            value={hospitalsWithActivity}
            label="Hospitales con actividad"
            description={`de ${hospitals.length} registrados`}
          />

          <SummaryCard
            icon={<Monitor size={20} />}
            value={totalEquipment}
            label="Equipos observados"
            description="En todas las visitas"
          />

          <SummaryCard
            icon={<ShieldAlert size={20} />}
            value={totalReview}
            label="Registros por revisar"
            description="Información incompleta"
            warning
          />

          <SummaryCard
            icon={<Clock3 size={20} />}
            value={totalPending}
            label="Visitas pendientes"
            description="Pendientes de sincronización"
            warning={totalPending > 0}
          />
        </section>

        {/* Search */}
        <section className="mt-6 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                aria-label="Buscar hospitales"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar hospital, ciudad o región..."
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
                Todos
              </FilterButton>

              <FilterButton
                active={filter === 'activity'}
                onClick={() => setFilter('activity')}
              >
                Con actividad
              </FilterButton>

              <FilterButton
                active={filter === 'review'}
                onClick={() => setFilter('review')}
              >
                Por revisar
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

        {/* Desktop table */}
        <section className="mt-5 hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm lg:block">
          <div className="grid grid-cols-[minmax(280px,1.5fr)_0.8fr_0.65fr_0.65fr_0.8fr_48px] items-center gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <span>Hospital</span>
            <span>Última visita</span>
            <span>Visitas</span>
            <span>Equipos</span>
            <span>Estado</span>
            <span />
          </div>

          {filteredHospitals.length > 0 ? (
            filteredHospitals.map((hospital, index) => (
              <button
                type="button"
                key={hospital.id}
                onClick={() =>
                  navigate(`/supervisor/hospitals/${hospital.id}`)
                }
                className={`group grid w-full grid-cols-[minmax(280px,1.5fr)_0.8fr_0.65fr_0.65fr_0.8fr_48px] items-center gap-4 px-6 py-5 text-left transition hover:bg-slate-50 ${
                  index !== filteredHospitals.length - 1
                    ? 'border-b border-slate-100'
                    : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
                    <Building2 size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {hospital.name}
                    </p>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin size={13} />
                      {hospital.city} · {hospital.region}
                    </p>
                  </div>
                </div>

                <div>
                  {hospital.lastVisit ? (
                    <>
                      <p className="text-sm font-medium text-slate-700">
                        {displayDate(hospital.lastVisit)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Última actividad
                      </p>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Sin visitas
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {hospital.visitCount}
                  </p>

                  <p className="text-xs text-slate-400">
                    registradas
                  </p>
                </div>

                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {hospital.equipmentCount}
                  </p>

                  <p className="text-xs text-slate-400">
                    observados
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {hospital.reviewCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                      <ShieldAlert size={13} />
                      {hospital.reviewCount} por revisar
                    </span>
                  )}

                  {hospital.pendingSyncCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700">
                      <Clock3 size={13} />
                      {hospital.pendingSyncCount} pendiente
                    </span>
                  )}

                  {hospital.visitCount > 0 &&
                    hospital.reviewCount === 0 &&
                    hospital.pendingSyncCount === 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                        <CircleCheck size={13} />
                        Sin alertas
                      </span>
                    )}

                  {hospital.visitCount === 0 && (
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500">
                      Sin actividad
                    </span>
                  )}
                </div>

                <ChevronRight
                  size={19}
                  className="justify-self-end text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#0B5ED7]"
                />
              </button>
            ))
          ) : (
            <EmptyState />
          )}
        </section>

        {/* Mobile/tablet cards */}
        <section className="mt-5 grid gap-4 lg:hidden">
          {filteredHospitals.length > 0 ? (
            filteredHospitals.map((hospital) => (
              <button
                type="button"
                key={hospital.id}
                onClick={() =>
                  navigate(`/supervisor/hospitals/${hospital.id}`)
                }
                className="group rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
                    <Building2 size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">
                          {hospital.name}
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <MapPin size={13} />
                          {hospital.city}
                        </p>
                      </div>

                      <ChevronRight
                        size={18}
                        className="shrink-0 text-slate-300"
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <MobileMetric
                        value={hospital.visitCount}
                        label="Visitas"
                      />

                      <MobileMetric
                        value={hospital.equipmentCount}
                        label="Equipos"
                      />

                      <MobileMetric
                        value={hospital.reviewCount}
                        label="Revisar"
                        warning={hospital.reviewCount > 0}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <CalendarDays size={14} />

                        {hospital.lastVisit
                          ? displayDate(hospital.lastVisit)
                          : 'Sin visitas registradas'}
                      </div>

                      {hospital.pendingSyncCount > 0 && (
                        <span className="rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">
                          {hospital.pendingSyncCount} pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </main>
  )
}

function needsReview(equipment: Equipment) {
  const unknown = (value?: string) =>
    !value || /desconocid|no informad/i.test(value)

  return (
    unknown(equipment.brand) ||
    unknown(equipment.model) ||
    !equipment.resolution
  )
}

function parseDate(value?: string) {
  if (!value) return 0

  const parsed = new Date(value).getTime()

  return Number.isNaN(parsed) ? 0 : parsed
}

function SummaryCard({
  icon,
  value,
  label,
  description,
  warning = false,
}: {
  icon: React.ReactNode
  value: number
  label: string
  description: string
  warning?: boolean
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          warning
            ? 'bg-amber-50 text-amber-600'
            : 'bg-blue-50 text-[#0B5ED7]'
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-900">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
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

function MobileMetric({
  value,
  label,
  warning = false,
}: {
  value: number
  label: string
  warning?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        warning ? 'bg-amber-50' : 'bg-slate-50'
      }`}
    >
      <p
        className={`text-lg font-semibold ${
          warning ? 'text-amber-800' : 'text-slate-950'
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-0.5 text-[11px] ${
          warning ? 'text-amber-700' : 'text-slate-400'
        }`}
      >
        {label}
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full px-6 py-14 text-center">
      <Search
        size={34}
        className="mx-auto text-slate-300"
      />

      <p className="mt-4 font-semibold text-slate-900">
        No encontramos hospitales
      </p>

      <p className="mt-1 text-sm text-slate-400">
        Cambia la búsqueda o selecciona otro filtro.
      </p>
    </div>
  )
}

export default HospitalsPage