import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Filter,
  Monitor,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'

import { getVisits } from '../../data/visits'
import {
  displayDate,
  readStored,
  writeStored,
  type Equipment,
} from '../../data/visitStore'

type ReviewFilter =
  | 'all'
  | 'incomplete'
  | 'confidence'
  | 'unresolved'
  | 'later'

type ReviewDecision = 'confirmed' | 'new' | 'later'

type ReviewDecisions = Record<string, ReviewDecision>

type ReviewItem = {
  key: string
  hospital: string
  area: string
  visitId: string
  observationId: string
  capturedAt: string
  equipment: Equipment
  reasons: string[]
  categories: Array<'incomplete' | 'confidence' | 'unresolved'>
}

function ReviewQueuePage() {
  const visits = useMemo(() => getVisits(), [])

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [error, setError] = useState('')

  const [decisions, setDecisions] = useState<ReviewDecisions>(() =>
    readStored<ReviewDecisions>('supervisor-review-decisions', {}),
  )

  const reviewItems = useMemo<ReviewItem[]>(() => {
    return visits.flatMap((visit) =>
      visit.observations.flatMap((observation) =>
        observation.equipment
          .map((equipment) => {
            const analysis = analyzeEquipment(equipment)

            return {
              key: `${visit.id}-${observation.id}-${equipment.id}`,
              hospital: visit.hospital,
              area: visit.area,
              visitId: visit.id,
              observationId: observation.id,
              capturedAt:
                observation.capturedAt ||
                visit.completedAt ||
                visit.date,
              equipment,
              reasons: analysis.reasons,
              categories: analysis.categories,
            }
          })
          .filter((item) => item.reasons.length > 0),
      ),
    )
  }, [visits])

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return reviewItems.filter((item) => {
      const decision = decisions[item.key]

      // Confirmados y mantenidos como nuevos salen de la cola.
      if (decision === 'confirmed' || decision === 'new') {
        return false
      }

      if (filter === 'later') {
        if (decision !== 'later') return false
      } else if (decision === 'later') {
        return false
      }

      if (
        filter !== 'all' &&
        filter !== 'later' &&
        !item.categories.includes(filter)
      ) {
        return false
      }

      if (!query) return true

      const searchable = [
        item.hospital,
        item.area,
        item.visitId,
        item.observationId,
        item.equipment.type,
        item.equipment.brand,
        item.equipment.model,
        item.equipment.configuration,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [reviewItems, decisions, search, filter])

  const activePendingCount = reviewItems.filter((item) => {
    const decision = decisions[item.key]
    return decision !== 'confirmed' && decision !== 'new'
  }).length

  const incompleteCount = reviewItems.filter(
    (item) =>
      item.categories.includes('incomplete') &&
      !isResolved(decisions[item.key]),
  ).length

  const lowConfidenceCount = reviewItems.filter(
    (item) =>
      item.categories.includes('confidence') &&
      !isResolved(decisions[item.key]),
  ).length

  const unresolvedCount = reviewItems.filter(
    (item) =>
      item.categories.includes('unresolved') &&
      !isResolved(decisions[item.key]),
  ).length

  const laterCount = reviewItems.filter(
    (item) => decisions[item.key] === 'later',
  ).length

  const updateDecision = (
    key: string,
    decision: ReviewDecision,
  ) => {
    const updated = { ...decisions, [key]: decision }
    try {
      writeStored('supervisor-review-decisions', updated)
      setDecisions(updated)
      setError('')
    } catch { setError('No se pudo guardar la decisión. Intenta de nuevo; el registro sigue pendiente.') }
  }

  const restoreDecision = (key: string) => {
    const updated = { ...decisions }
    delete updated[key]
    try {
      writeStored('supervisor-review-decisions', updated)
      setDecisions(updated)
      setError('')
    } catch { setError('No se pudo restaurar la decisión. Intenta de nuevo.') }
  }

  return (
    <main className="px-4 pb-12 pt-7 sm:px-6 lg:px-8 lg:pt-9">
      <div className="mx-auto max-w-[1380px]">
        {error && <p role="alert" className="storage-error">{error}</p>}
        {/* Intro */}
        <section className="mb-7">
          <p className="text-sm font-semibold text-[#0B5ED7]">
            Calidad de datos
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Por revisar
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Valida observaciones incompletas o de baja confianza antes de
            incorporarlas como información confiable de la base instalada.
          </p>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<ShieldAlert size={20} />}
            value={activePendingCount}
            label="Pendientes"
            description="Requieren atención"
            warning={activePendingCount > 0}
          />

          <SummaryCard
            icon={<AlertTriangle size={20} />}
            value={incompleteCount}
            label="Incompletos"
            description="Faltan datos del equipo"
            warning={incompleteCount > 0}
          />

          <SummaryCard
            icon={<Sparkles size={20} />}
            value={lowConfidenceCount}
            label="Baja confianza"
            description="Extracción por validar"
            warning={lowConfidenceCount > 0}
          />

          <SummaryCard
            icon={<Clock3 size={20} />}
            value={laterCount}
            label="Para después"
            description="Revisión pospuesta"
          />
        </section>

        {/* Search + filters */}
        <section className="mt-6 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                aria-label="Buscar registros por revisar"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar hospital, equipo, marca o modelo..."
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
                active={filter === 'incomplete'}
                onClick={() => setFilter('incomplete')}
              >
                Incompletos
              </FilterButton>

              <FilterButton
                active={filter === 'confidence'}
                onClick={() => setFilter('confidence')}
              >
                Baja confianza
              </FilterButton>

              <FilterButton
                active={filter === 'unresolved'}
                onClick={() => setFilter('unresolved')}
              >
                Sin resolver
              </FilterButton>

              <FilterButton
                active={filter === 'later'}
                onClick={() => setFilter('later')}
              >
                Después
              </FilterButton>
            </div>
          </div>
        </section>

        {/* Result heading */}
        <section className="mt-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Cola de revisión
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {visibleItems.length}{' '}
              {visibleItems.length === 1
                ? 'registro visible'
                : 'registros visibles'}
            </p>
          </div>

          {unresolvedCount > 0 && (
            <span className="hidden rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 sm:inline-flex">
              {unresolvedCount} sin decisión
            </span>
          )}
        </section>

        {/* Review cards */}
        <section className="mt-4 space-y-4">
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => (
              <ReviewCard
                key={item.key}
                item={item}
                decision={decisions[item.key]}
                onConfirm={() =>
                  updateDecision(item.key, 'confirmed')
                }
                onKeepNew={() =>
                  updateDecision(item.key, 'new')
                }
                onLater={() =>
                  updateDecision(item.key, 'later')
                }
                onRestore={() =>
                  restoreDecision(item.key)
                }
              />
            ))
          ) : (
            <EmptyState filter={filter} />
          )}
        </section>

        {/* Demo notice */}
        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#0B5ED7] shadow-sm">
              <CheckCircle2 size={16} />
            </div>

            <div>
              <p className="text-sm font-semibold text-blue-950">
                Flujo de demostración
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Las decisiones de revisión se almacenan localmente en este
                navegador. La sincronización definitiva con el backend se
                integrará posteriormente.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function ReviewCard({
  item,
  decision,
  onConfirm,
  onKeepNew,
  onLater,
  onRestore,
}: {
  item: ReviewItem
  decision?: ReviewDecision
  onConfirm: () => void
  onKeepNew: () => void
  onLater: () => void
  onRestore: () => void
}) {
  const equipment = item.equipment

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          {/* Equipment */}
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Monitor size={21} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-950">
                  {equipment.type || 'Equipo no especificado'}
                </h3>

                {decision === 'later' && (
                  <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                    Revisar después
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} />
                  {item.hospital}
                </span>

                <span>{item.area}</span>

                <span>{displayDate(item.capturedAt)}</span>
              </div>
            </div>
          </div>

          {/* Reasons */}
          <div className="flex max-w-xl flex-wrap gap-2">
            {item.reasons.map((reason) => (
              <span
                key={reason}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700"
              >
                <AlertTriangle size={12} />
                {reason}
              </span>
            ))}
          </div>
        </div>

        {/* Data */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DataField
            label="Marca"
            value={safeValue(equipment.brand)}
            warning={isUnknown(equipment.brand)}
          />

          <DataField
            label="Modelo"
            value={safeValue(equipment.model)}
            warning={isUnknown(equipment.model)}
          />

          <DataField
            label="Configuración"
            value={safeValue(equipment.configuration)}
            warning={isUnknown(equipment.configuration)}
          />

          <DataField
            label="Antigüedad"
            value={safeValue(equipment.estimatedAge)}
          />

          <DataField
            label="Confianza"
            value={formatConfidence(equipment.confidence)}
            warning={isLowConfidence(equipment.confidence)}
          />
        </div>

        {/* Source */}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
          <span>
            Visita{' '}
            <strong className="font-semibold text-slate-600">
              {item.visitId}
            </strong>
          </span>

          <span>
            Observación{' '}
            <strong className="font-semibold text-slate-600">
              {item.observationId}
            </strong>
          </span>

          <span>
            Resolución actual:{' '}
            <strong className="font-semibold text-slate-600">
              {resolutionLabel(equipment.resolution)}
            </strong>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
        {decision === 'later' ? (
          <button
            type="button"
            onClick={onRestore}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw size={16} />
            Volver a pendientes
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onLater}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Clock3 size={16} />
              Revisar después
            </button>

            <button
              type="button"
              onClick={onKeepNew}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              <Sparkles size={16} />
              Mantener como nuevo
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0B5ED7] px-4 text-sm font-semibold text-white transition hover:bg-[#0954C4]"
            >
              <Check size={17} />
              Confirmar
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function analyzeEquipment(equipment: Equipment) {
  const reasons: string[] = []

  const categories: ReviewItem['categories'] = []

  if (isUnknown(equipment.brand)) {
    reasons.push('Marca no informada')
    addCategory(categories, 'incomplete')
  }

  if (isUnknown(equipment.model)) {
    reasons.push('Modelo no informado')
    addCategory(categories, 'incomplete')
  }

  if (isUnknown(equipment.configuration)) {
    reasons.push('Configuración incompleta')
    addCategory(categories, 'incomplete')
  }

  if (!equipment.resolution) {
    reasons.push('Sin decisión de coincidencia')
    addCategory(categories, 'unresolved')
  }

  if (isLowConfidence(equipment.confidence)) {
    reasons.push('Baja confianza de extracción')
    addCategory(categories, 'confidence')
  }

  return {
    reasons,
    categories,
  }
}

function addCategory(
  categories: ReviewItem['categories'],
  category: ReviewItem['categories'][number],
) {
  if (!categories.includes(category)) {
    categories.push(category)
  }
}

function isUnknown(value?: string) {
  return (
    !value?.trim() ||
    /desconocid|no informad|sin especificar/i.test(value)
  )
}

function safeValue(value?: string) {
  return isUnknown(value) ? 'No informado' : value!
}

function isLowConfidence(confidence?: number) {
  if (confidence === undefined || confidence === null) {
    return false
  }

  const percentage =
    confidence <= 1
      ? confidence * 100
      : confidence

  return percentage < 75
}

function formatConfidence(confidence?: number) {
  if (confidence === undefined || confidence === null) {
    return 'No disponible'
  }

  const percentage =
    confidence <= 1
      ? confidence * 100
      : confidence

  return `${Math.round(percentage)}%`
}

function resolutionLabel(
  resolution?: 'existing' | 'new' | 'review',
) {
  if (resolution === 'existing') {
    return 'Vinculado a existente'
  }

  if (resolution === 'new') {
    return 'Equipo nuevo'
  }

  return 'Sin resolver'
}

function isResolved(decision?: ReviewDecision) {
  return decision === 'confirmed' || decision === 'new'
}

function SummaryCard({
  icon,
  value,
  label,
  description,
  warning = false,
}: {
  icon: ReactNode
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
  children: ReactNode
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

function DataField({
  label,
  value,
  warning = false,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-3.5 ${
        warning
          ? 'bg-amber-50'
          : 'bg-slate-50'
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${
          warning
            ? 'text-amber-600'
            : 'text-slate-400'
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1.5 text-sm font-medium ${
          warning
            ? 'text-amber-900'
            : 'text-slate-700'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function EmptyState({
  filter,
}: {
  filter: ReviewFilter
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={27} />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-950">
        {filter === 'later'
          ? 'No hay revisiones pospuestas'
          : 'No hay registros pendientes'}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
        {filter === 'later'
          ? 'Los registros que decidas revisar después aparecerán aquí.'
          : 'No encontramos registros que coincidan con la búsqueda y los filtros seleccionados.'}
      </p>
    </div>
  )
}

export default ReviewQueuePage
