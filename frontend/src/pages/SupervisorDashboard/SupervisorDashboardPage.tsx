import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Database,
  Monitor,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'

import { getVisits } from '../../data/visits'
import { hospitals as hospitalCatalog } from '../../data/hospitals'
import {
  displayDate,
  type Equipment,
} from '../../data/visitStore'

function SupervisorDashboardPage() {
  const navigate = useNavigate()

  const visits = useMemo(() => getVisits(), [])

  const equipment = useMemo(
    () =>
      visits.flatMap((visit) =>
        visit.observations.flatMap((observation) =>
          observation.equipment.map((item) => ({
            ...item,
            hospital: visit.hospital,
            visitId: visit.id,
            observationId: observation.id,
          })),
        ),
      ),
    [visits],
  )

  const hospitals = useMemo(
    () => [...new Set(visits.map((visit) => visit.hospital))],
    [visits],
  )

  const pendingVisits = visits.filter(
    (visit) => visit.syncStatus === 'pending',
  )

  const incompleteEquipment = equipment.filter(needsReview)

  const recentVisits = [...visits]
    .sort((a, b) => {
      const first = new Date(a.completedAt).getTime()
      const second = new Date(b.completedAt).getTime()

      return (Number.isNaN(second) ? 0 : second) -
        (Number.isNaN(first) ? 0 : first)
    })
    .slice(0, 5)

  const linkedCount = equipment.filter(
    (item) => item.resolution === 'existing',
  ).length

  const newCount = equipment.filter(
    (item) => item.resolution === 'new',
  ).length

  return (
    <main className="px-4 pb-12 pt-7 sm:px-6 lg:px-8 lg:pt-9">
      <div className="mx-auto max-w-[1380px]">
        {/* Intro */}
        <section className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0B5ED7]">
              Installed Base Intelligence
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Resumen de la operación
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Visibilidad de las visitas de campo, equipos observados y
              registros que requieren atención.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/supervisor/hospitals')}
            className="flex w-fit items-center gap-2 rounded-xl bg-[#0B5ED7] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0954C4]"
          >
            Explorar hospitales
            <ArrowRight size={17} />
          </button>
        </section>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Building2 size={21} />}
            label="Hospitales observados"
            value={hospitals.length}
            description="Con información disponible"
          />

          <MetricCard
            icon={<Monitor size={21} />}
            label="Equipos registrados"
            value={equipment.length}
            description="En la base observada"
          />

          <MetricCard
            icon={<ClipboardList size={21} />}
            label="Visitas registradas"
            value={visits.length}
            description="Historial disponible"
          />

          <MetricCard
            icon={<ShieldAlert size={21} />}
            label="Por revisar"
            value={incompleteEquipment.length}
            description="Registros incompletos"
            warning
          />
        </section>

        {/* Main grid */}
        <section className="mt-6 grid gap-5 xl:grid-cols-12">
          {/* Recent activity */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-7">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B5ED7]">
                  Actividad
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Visitas recientes
                </h2>
              </div>

              <span className="text-xs text-slate-400">
                {visits.length} registradas
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              {recentVisits.length > 0 ? (
                recentVisits.map((visit, index) => {
                  const visitEquipment = visit.observations.reduce(
                    (total, observation) =>
                      total + observation.equipment.length,
                    0,
                  )

                  return (
                    <button
                      type="button"
                      key={visit.id}
                      onClick={() =>
                        navigate(
                          hospitalCatalog.find(hospital => hospital.name === visit.hospital)
                            ? `/supervisor/hospitals/${hospitalCatalog.find(hospital => hospital.name === visit.hospital)!.id}`
                            : '/supervisor/hospitals',
                        )
                      }
                      className={`group flex w-full items-center gap-4 bg-white px-4 py-4 text-left transition hover:bg-slate-50 ${
                        index !== recentVisits.length - 1
                          ? 'border-b border-slate-100'
                          : ''
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
                        <Building2 size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {visit.hospital}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {visit.area} · {displayDate(visit.completedAt)}
                        </p>
                      </div>

                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold">
                          {visitEquipment}
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
                  )
                })
              ) : (
                <EmptyMessage message="Todavía no hay visitas registradas." />
              )}
            </div>
          </div>

          {/* Installed base */}
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm xl:col-span-5">
            <div
              className="relative overflow-hidden p-6 text-white"
              style={{
                background:
                  'linear-gradient(115deg, #4A0982 0%, #351D8E 24%, #19379D 50%, #0455A8 73%, #208E94 100%)',
              }}
            >
              <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full border border-white/10" />

              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Database size={20} />
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
                  Base instalada observada
                </p>

                <p className="mt-2 text-3xl font-semibold">
                  {equipment.length} equipos
                </p>

                <p className="mt-2 text-sm text-white/75">
                  Distribuidos entre {hospitals.length}{' '}
                  {hospitals.length === 1 ? 'hospital' : 'hospitales'}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-100 p-6">
              <SmallMetric
                value={linkedCount}
                label="Vinculados"
                icon={<CheckCircle2 size={17} />}
              />

              <SmallMetric
                value={newCount}
                label="Nuevos"
                icon={<Sparkles size={17} />}
              />
            </div>

            <div className="border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={() => navigate('/supervisor/hospitals')}
                className="flex w-full items-center justify-between text-sm font-semibold text-[#0B5ED7]"
              >
                Ver base instalada por hospital
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>

        {/* Secondary */}
        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* Review */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <TriangleAlert size={20} />
              </div>

              <div className="flex-1">
                <p className="font-semibold text-slate-950">
                  Calidad de datos
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Registros con información incompleta que pueden requerir
                  validación.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between rounded-2xl bg-amber-50 p-5">
              <div>
                <p className="text-3xl font-semibold text-amber-950">
                  {incompleteEquipment.length}
                </p>

                <p className="mt-1 text-xs text-amber-700">
                  equipos requieren atención
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/supervisor/review')}
                className="flex items-center gap-1 text-sm font-semibold text-amber-800"
              >
                Revisar
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Sync */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  pendingVisits.length
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <Activity size={20} />
              </div>

              <div>
                <p className="font-semibold">
                  Estado de sincronización
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Registros generados por colaboradores de campo.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <CheckCircle2
                  size={18}
                  className="text-emerald-600"
                />

                <p className="mt-3 text-2xl font-semibold">
                  {
                    visits.filter(
                      (visit) => visit.syncStatus === 'synced',
                    ).length
                  }
                </p>

                <p className="mt-1 text-xs text-emerald-700">
                  Sincronizadas
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4">
                <Clock3 size={18} className="text-amber-600" />

                <p className="mt-3 text-2xl font-semibold">
                  {pendingVisits.length}
                </p>

                <p className="mt-1 text-xs text-amber-700">
                  Pendientes
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function needsReview(equipment: Equipment) {
  const unknown = (value?: string) =>
    !value ||
    /desconocid|no informad/i.test(value)

  return (
    unknown(equipment.brand) ||
    unknown(equipment.model) ||
    !equipment.resolution
  )
}

function MetricCard({
  icon,
  label,
  value,
  description,
  warning = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  description: string
  warning?: boolean
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          warning
            ? 'bg-amber-50 text-amber-600'
            : 'bg-blue-50 text-[#0B5ED7]'
        }`}
      >
        {icon}
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-sm font-semibold">{label}</p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  )
}

function SmallMetric({
  value,
  label,
  icon,
}: {
  value: number
  label: string
  icon: React.ReactNode
}) {
  return (
    <div className="px-3 text-center">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
        {icon}
      </div>

      <p className="mt-3 text-2xl font-semibold">{value}</p>

      <p className="mt-1 text-xs text-slate-400">
        {label}
      </p>
    </div>
  )
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="p-8 text-center text-sm text-slate-400">
      {message}
    </div>
  )
}

export default SupervisorDashboardPage
