import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Cloud, CloudOff, Clock3, MapPin, MessageSquareText, Monitor, Radio, ScanLine, Sparkles } from 'lucide-react'

import { useVisits } from '../../data/useVisits'
import { displayDate, observationTitle, type Equipment } from '../../data/visitStore'
type SyncStatus = 'synced' | 'pending'
type EquipmentResolution = 'existing' | 'new'

function VisitDetailPage() {
  const navigate = useNavigate()
  const { visitId } = useParams()

  const { visits, loading, error } = useVisits()
  const visit = visits.find((item) => item.id === visitId)

  if (!visit && loading) return <p role="status">Cargando visita...</p>
  if (!visit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F5F9] px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Building2 size={26} />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-slate-950">
            Visita no encontrada
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || 'No pudimos encontrar la visita solicitada.'}
          </p>

          <button
            onClick={() => navigate('/visits')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B5ED7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0954C4]"
          >
            <ArrowLeft size={17} />
            Volver a mis visitas
          </button>
        </div>
      </div>
    )
  }

  const equipment = visit.observations.flatMap(
    (observation) => observation.equipment,
  )

  const existingCount = equipment.filter(
    (item) => item.resolution === 'existing',
  ).length

  const newCount = equipment.filter(
    (item) => item.resolution === 'new',
  ).length

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-slate-900">
      {/* Header */}


      <main className="mx-auto max-w-[1380px] px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-4 flex items-center justify-between gap-4"><h1 className="text-xl font-semibold">Detalle de visita</h1><SyncStatusBadge status={visit.syncStatus} /></div>
        {/* Hospital */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className="px-5 py-6 text-white sm:px-7"
            style={{
              background:
                '#0B5ED7',
            }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <Building2 size={23} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/70">
                    {visit.id}
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {visit.hospital}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={15} />
                      {visit.area}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={15} />
                      {displayDate(visit.date)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs font-medium text-white/70">
                  Duración de la visita
                </p>

                <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                  <Clock3 size={16} />
                  {displayDate(visit.startedAt, true)} – {displayDate(visit.completedAt, true)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
            <SummaryItem
              value={visit.observations.length}
              label="Observaciones"
            />

            <SummaryItem value={equipment.length} label="Equipos detectados" />

            <SummaryItem value={existingCount} label="Existentes vinculados" />

            <SummaryItem value={newCount} label="Equipos nuevos" />
          </div>
        </section>

        {/* Visit info */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Ubicación
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Hospital" value={visit.hospital} />
              <InfoRow label="Área" value={visit.area} />
              <InfoRow label="Región" value={visit.region} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Estado
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Fecha" value={displayDate(visit.date)} />
              <InfoRow label="Inicio" value={displayDate(visit.startedAt, true)} />
              <InfoRow label="Finalización" value={displayDate(visit.completedAt, true)} />
            </div>
          </div>
        </section>

        {/* Observations */}
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0B5ED7]">
                Evidencia capturada
              </p>

              <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">
                Observaciones
              </h2>
            </div>

            <span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
              {visit.observations.length}{' '}
              {visit.observations.length === 1
                ? 'observación'
                : 'observaciones'}
            </span>
          </div>

          <div className="space-y-5">
            {visit.observations.length === 0 && <p className="panel">Esta visita no tiene observaciones registradas.</p>}
            {visit.observations.map((observation) => (
              <article
                key={observation.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                        {observation.captureMode === 'voice' ? (
                          <Radio size={19} />
                        ) : (
                          <MessageSquareText size={19} />
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-950">
                          {observation.title || observationTitle(observation.equipment)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Capturada por{' '}
                          {observation.captureMode === 'voice'
                            ? 'voz'
                            : 'chat'} · {observation.capturedAt ? displayDate(observation.capturedAt, true) : 'Hora no informada'}
                        </p>
                      </div>
                    </div>

                    <span className="flex w-fit items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700">
                      <Sparkles size={13} />
                      Registro de observación
                    </span>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Texto original
                    </p>

                    <p className="text-sm leading-6 text-slate-700">
                      “{observation.originalText}”
                    </p>
                    {observation.photoData && <img src={observation.photoData} alt="Fotografía de la observación" className="mt-4 max-h-64 rounded-xl" />}
                  </div>
                </div>

                <div className="px-5 py-5 sm:px-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-950">
                      Equipos detectados
                    </h3>

                    <span className="text-xs font-medium text-slate-400">
                      {observation.equipment.length}{' '}
                      {observation.equipment.length === 1
                        ? 'equipo'
                        : 'equipos'}
                    </span>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {observation.equipment.map((item) => (
                      <EquipmentCard key={item.id} equipment={item} />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function SummaryItem({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div className="px-4 py-5 text-center">
      <p className="text-2xl font-semibold text-slate-950">{value || 'Desconocido'}</p>
      <p className="mt-1 text-xs text-slate-500 sm:text-sm">{label}</p>
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}

function EquipmentCard({
  equipment,
}: {
  equipment: Equipment
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
            {equipment.type.toLowerCase().includes('tomógrafo') ? (
              <ScanLine size={19} />
            ) : (
              <Monitor size={19} />
            )}
          </div>

          <div>
            <h4 className="font-semibold text-slate-950">
              {equipment.type || 'Equipo no informado'}
            </h4>

            <p className="mt-0.5 text-xs text-slate-400">
              {equipment.id}
            </p>
          </div>
        </div>

        <ResolutionBadge
          resolution={equipment.resolution || 'new'}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 text-sm">
        <EquipmentField
          label="Marca"
          value={equipment.brand}
        />

        <EquipmentField
          label="Modelo"
          value={equipment.model}
        />

        <EquipmentField
          label="Configuración"
          value={equipment.configuration ?? 'No informada'}
        />

        <EquipmentField
          label="Edad aprox."
          value={equipment.estimatedAge ?? 'No informada'}
        />

        <EquipmentField
          label="Estado"
          value={equipment.status ?? 'No informado'}
        />

        {equipment.matchedEquipmentId && (
          <EquipmentField
            label="Vinculado a"
            value={equipment.matchedEquipmentId}
          />
        )}
      </div>
    </div>
  )
}

function EquipmentField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-700">{value || 'Desconocido'}</p>
    </div>
  )
}

function ResolutionBadge({
  resolution,
}: {
  resolution: EquipmentResolution
}) {
  if (resolution === 'existing') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
        <CheckCircle2 size={13} />
        Vinculado
      </span>
    )
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700">
      <Sparkles size={13} />
      Nuevo
    </span>
  )
}

function SyncStatusBadge({
  status,
}: {
  status: SyncStatus
}) {
  if (status === 'synced') {
    return (
      <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
        <Cloud size={15} />
        <span>Guardada</span>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
      <CloudOff size={15} />
      <span>Pendiente</span>
    </span>
  )
}

export default VisitDetailPage
