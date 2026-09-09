import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Filter,
  History,
  MapPin,
  Monitor,
  Search,
  Sparkles,
} from 'lucide-react'

import { hospitals } from '../../data/hospitals'
import { getVisits } from '../../data/visits'
import {
  displayDate,
  type Equipment,
  type Visit,
} from '../../data/visitStore'

type InstalledEquipment = Equipment & {
  key: string
  sourceVisitId: string
  sourceObservationId: string
  lastObservedAt: string
  observationCount: number
  needsReview: boolean
}

type EquipmentFilter = 'all' | 'existing' | 'new' | 'review'

function HospitalDetailPage() {
  const navigate = useNavigate()
  const { hospitalId } = useParams()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<EquipmentFilter>('all')

  const hospital = hospitals.find((item) => item.id === hospitalId)

  const allVisits = useMemo(() => getVisits(), [])

  const hospitalVisits = useMemo(() => {
    if (!hospital) return []

    return allVisits.filter(
      (visit) => visit.hospital === hospital.name,
    )
  }, [allVisits, hospital])

  const installedBase = useMemo(
    () => buildInstalledBase(hospitalVisits),
    [hospitalVisits],
  )

  const filteredEquipment = useMemo(() => {
    const query = search.trim().toLowerCase()

    return installedBase.filter((equipment) => {
      const matchesSearch =
        !query ||
        equipment.type.toLowerCase().includes(query) ||
        equipment.brand?.toLowerCase().includes(query) ||
        equipment.model?.toLowerCase().includes(query) ||
        equipment.configuration?.toLowerCase().includes(query)

      if (!matchesSearch) return false

      if (filter === 'existing') {
        return equipment.resolution === 'existing'
      }

      if (filter === 'new') {
        return equipment.resolution === 'new'
      }

      if (filter === 'review') {
        return equipment.needsReview
      }

      return true
    })
  }, [installedBase, search, filter])

  if (!hospital) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Building2 size={26} />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-slate-950">
            Hospital no encontrado
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            No encontramos el hospital solicitado.
          </p>

          <button
            type="button"
            onClick={() => navigate('/supervisor/hospitals')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B5ED7] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft size={17} />
            Volver a hospitales
          </button>
        </div>
      </main>
    )
  }

  const existingCount = installedBase.filter(
    (item) => item.resolution === 'existing',
  ).length

  const newCount = installedBase.filter(
    (item) => item.resolution === 'new',
  ).length

  const reviewCount = installedBase.filter(
    (item) => item.needsReview,
  ).length

  const pendingVisits = hospitalVisits.filter(
    (visit) => visit.syncStatus === 'pending',
  ).length

  return (
    <main className="px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-[1380px]">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/supervisor/hospitals')}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#0B5ED7]"
        >
          <ArrowLeft size={17} />
          Hospitales
        </button>

        {/* Hospital hero */}
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div
            className="relative overflow-hidden px-5 py-7 text-white sm:px-8 sm:py-8"
            style={{
              background:
                'linear-gradient(115deg, #4A0982 0%, #351D8E 24%, #19379D 50%, #0455A8 73%, #208E94 100%)',
            }}
          >
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-5 -top-8 h-48 w-48 rounded-full bg-white/[0.04]" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Building2 size={26} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                    {hospital.id}
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {hospital.name}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={15} />
                      {hospital.city}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Building2 size={15} />
                      {hospital.region}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex">
                <HeroMetric
                  value={hospitalVisits.length}
                  label="Visitas"
                />

                <HeroMetric
                  value={installedBase.length}
                  label="Equipos"
                />
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 lg:grid-cols-4 lg:divide-y-0">
            <HospitalMetric
              value={existingCount}
              label="Equipos vinculados"
              icon={<CheckCircle2 size={18} />}
            />

            <HospitalMetric
              value={newCount}
              label="Equipos nuevos"
              icon={<Sparkles size={18} />}
            />

            <HospitalMetric
              value={reviewCount}
              label="Por revisar"
              icon={<AlertTriangle size={18} />}
              warning={reviewCount > 0}
            />

            <HospitalMetric
              value={pendingVisits}
              label="Pendientes de sincronizar"
              icon={<Clock3 size={18} />}
              warning={pendingVisits > 0}
            />
          </div>
        </section>

        {/* Section title */}
        <section className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B5ED7]">
              Inteligencia de cliente
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Base instalada observada
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Equipos identificados a partir de las visitas realizadas al
              hospital.
            </p>
          </div>

          <span className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm">
            {installedBase.length}{' '}
            {installedBase.length === 1 ? 'equipo único' : 'equipos únicos'}
          </span>
        </section>

        {/* Search */}
        <section className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar tipo, marca, modelo o configuración..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B5ED7] focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter
                size={17}
                className="mr-1 hidden shrink-0 text-slate-400 sm:block"
              />

              <FilterButton
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                Todos
              </FilterButton>

              <FilterButton
                active={filter === 'existing'}
                onClick={() => setFilter('existing')}
              >
                Vinculados
              </FilterButton>

              <FilterButton
                active={filter === 'new'}
                onClick={() => setFilter('new')}
              >
                Nuevos
              </FilterButton>

              <FilterButton
                active={filter === 'review'}
                onClick={() => setFilter('review')}
              >
                Por revisar
              </FilterButton>
            </div>
          </div>
        </section>

        {/* Equipment */}
        <section className="mt-5">
          {filteredEquipment.length > 0 ? (
            <>
              {/* Desktop */}
              <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm lg:block">
                <div className="grid grid-cols-[1.2fr_1fr_0.85fr_0.75fr_0.85fr_48px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <span>Equipo</span>
                  <span>Marca / modelo</span>
                  <span>Configuración</span>
                  <span>Antigüedad</span>
                  <span>Estado</span>
                  <span />
                </div>

                {filteredEquipment.map((equipment, index) => (
                  <div
                    key={equipment.key}
                    className={`grid grid-cols-[1.2fr_1fr_0.85fr_0.75fr_0.85fr_48px] items-center gap-4 px-6 py-5 ${
                      index !== filteredEquipment.length - 1
                        ? 'border-b border-slate-100'
                        : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
                        <Monitor size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {equipment.type || 'Equipo no especificado'}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {equipment.matchedEquipmentId ||
                            'Sin ID de base instalada'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {safeValue(equipment.brand)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {safeValue(equipment.model)}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600">
                      {safeValue(equipment.configuration)}
                    </p>

                    <p className="text-sm text-slate-600">
                      {safeValue(equipment.estimatedAge)}
                    </p>

                    <EquipmentStatus equipment={equipment} />

                    <ChevronRight
                      size={18}
                      className="justify-self-end text-slate-300"
                    />
                  </div>
                ))}
              </div>

              {/* Mobile */}
              <div className="grid gap-4 lg:hidden">
                {filteredEquipment.map((equipment) => (
                  <article
                    key={equipment.key}
                    className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
                        <Monitor size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {equipment.type || 'Equipo no especificado'}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {safeValue(equipment.brand)} ·{' '}
                              {safeValue(equipment.model)}
                            </p>
                          </div>

                          {equipment.needsReview && (
                            <CircleAlert
                              size={18}
                              className="shrink-0 text-amber-500"
                            />
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <InfoBox
                            label="Configuración"
                            value={safeValue(equipment.configuration)}
                          />

                          <InfoBox
                            label="Antigüedad"
                            value={safeValue(equipment.estimatedAge)}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                          <EquipmentStatus equipment={equipment} />

                          <ResolutionBadge
                            resolution={equipment.resolution}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <Monitor
                size={38}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-900">
                No encontramos equipos
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Cambia los filtros o registra una visita a este hospital.
              </p>
            </div>
          )}
        </section>

        {/* Bottom grid */}
        <section className="mt-8 grid gap-5 xl:grid-cols-12">
          {/* Visit history */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B5ED7]">
                  Evidencia
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Historial de visitas
                </h2>
              </div>

              <History size={20} className="text-slate-300" />
            </div>

            {hospitalVisits.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                {hospitalVisits.map((visit, index) => {
                  const equipmentCount = visit.observations.reduce(
                    (total, observation) =>
                      total + observation.equipment.length,
                    0,
                  )

                  return (
                    <div
                      key={visit.id}
                      className={`flex items-center gap-4 px-4 py-4 ${
                        index !== hospitalVisits.length - 1
                          ? 'border-b border-slate-100'
                          : ''
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <CalendarDays size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">
                          {visit.area}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {displayDate(visit.completedAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {equipmentCount}
                        </p>

                        <p className="text-[11px] text-slate-400">
                          equipos
                        </p>
                      </div>

                      <SyncBadge status={visit.syncStatus} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-400">
                Este hospital todavía no tiene visitas registradas.
              </p>
            )}
          </div>

          {/* Data quality */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  reviewCount > 0
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {reviewCount > 0 ? (
                  <AlertTriangle size={19} />
                ) : (
                  <CheckCircle2 size={19} />
                )}
              </div>

              <div>
                <h2 className="font-semibold text-slate-950">
                  Calidad de datos
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Información que puede requerir validación.
                </p>
              </div>
            </div>

            <div
              className={`mt-5 rounded-2xl p-5 ${
                reviewCount > 0 ? 'bg-amber-50' : 'bg-emerald-50'
              }`}
            >
              <p className="text-3xl font-semibold">
                {reviewCount}
              </p>

              <p
                className={`mt-1 text-sm ${
                  reviewCount > 0
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {reviewCount === 1
                  ? 'registro necesita revisión'
                  : 'registros necesitan revisión'}
              </p>
            </div>

            {reviewCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/supervisor/review')}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#0B5ED7] transition hover:bg-slate-50"
              >
                Ir a revisión
                <ChevronRight size={17} />
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function buildInstalledBase(visits: Visit[]): InstalledEquipment[] {
  const equipmentMap = new Map<string, InstalledEquipment>()

  visits.forEach((visit) => {
    visit.observations.forEach((observation) => {
      observation.equipment.forEach((equipment) => {
        const key =
          equipment.resolution === 'existing' &&
          equipment.matchedEquipmentId
            ? equipment.matchedEquipmentId
            : `${visit.id}-${observation.id}-${equipment.id}`

        const existing = equipmentMap.get(key)

        if (existing) {
          existing.observationCount += 1

          const currentDate = parseDate(existing.lastObservedAt)
          const newDate = parseDate(
            observation.capturedAt || visit.completedAt,
          )

          if (newDate >= currentDate) {
            equipmentMap.set(key, {
              ...existing,
              ...equipment,
              key,
              sourceVisitId: visit.id,
              sourceObservationId: observation.id,
              lastObservedAt:
                observation.capturedAt || visit.completedAt,
              observationCount: existing.observationCount,
              needsReview: equipmentNeedsReview(equipment),
            })
          }

          return
        }

        equipmentMap.set(key, {
          ...equipment,
          key,
          sourceVisitId: visit.id,
          sourceObservationId: observation.id,
          lastObservedAt:
            observation.capturedAt || visit.completedAt,
          observationCount: 1,
          needsReview: equipmentNeedsReview(equipment),
        })
      })
    })
  })

  return [...equipmentMap.values()]
}

function equipmentNeedsReview(equipment: Equipment) {
  const unknown = (value?: string) =>
    !value ||
    /desconocid|no informad/i.test(value)

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

function safeValue(value?: string) {
  if (!value || /desconocid|no informad/i.test(value)) {
    return 'No informado'
  }

  return value
}

function HeroMetric({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div className="min-w-[110px] rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
      <p className="text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/65">
        {label}
      </p>
    </div>
  )
}

function HospitalMetric({
  value,
  label,
  icon,
  warning = false,
}: {
  value: number
  label: string
  icon: React.ReactNode
  warning?: boolean
}) {
  return (
    <div className="p-5 sm:p-6">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          warning
            ? 'bg-amber-50 text-amber-600'
            : 'bg-blue-50 text-[#0B5ED7]'
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400 sm:text-sm">
        {label}
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

function EquipmentStatus({
  equipment,
}: {
  equipment: InstalledEquipment
}) {
  if (equipment.needsReview) {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
        <AlertTriangle size={13} />
        Revisar
      </span>
    )
  }

  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
      <CheckCircle2 size={13} />
      Completo
    </span>
  )
}

function ResolutionBadge({
  resolution,
}: {
  resolution?: 'existing' | 'new'
}) {
  if (resolution === 'existing') {
    return (
      <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
        Vinculado
      </span>
    )
  }

  if (resolution === 'new') {
    return (
      <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700">
        Nuevo
      </span>
    )
  }

  return (
    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500">
      Sin resolver
    </span>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-700">
        {value}
      </p>
    </div>
  )
}

function SyncBadge({
  status,
}: {
  status: 'synced' | 'pending'
}) {
  return status === 'synced' ? (
    <span className="hidden rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">
      Sincronizada
    </span>
  ) : (
    <span className="hidden rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex">
      Pendiente
    </span>
  )
}

export default HospitalDetailPage