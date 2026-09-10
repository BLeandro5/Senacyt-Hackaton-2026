import { persistVisit } from '../../data/storageApi'
import { useState } from 'react'
import { readStored, clearObservation, type RecordDraft, type Decision } from '../../data/visitStore'
import VisitContext from '../../components/VisitContext'
import { useNavigate } from 'react-router-dom'
import { Check, CheckCircle2, ChevronRight, Home, Plus, Sparkles } from 'lucide-react'

function SuccessPage() {
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const record = readStored<RecordDraft>('current-structured-record', { hospitalName: '', originalObservation: '', equipment: [] })
  const equipment = record.equipment
  const decisions = readStored<{ decisions: Decision[] }>('match-result', { decisions: [] }).decisions
  const existingCount = decisions.filter(d => d.type === 'existing').length
  const newCount = decisions.filter(d => d.type === 'new').length
  const handleAnotherObservation = async () => {
    if (saving) return
    setSaving(true)
    try { await persistVisit(); clearObservation(); navigate('/visits/new/capture') }
    catch (cause) { setSaving(false); setError(cause instanceof Error ? cause.message : 'No se pudo guardar en SQLite. Comprueba el backend y reintenta. Tus datos siguen abiertos.') }
  }
  const handleFinishVisit = async () => {
    if (saving) return
    setSaving(true)
    try { await persistVisit(true); navigate('/visits') }
    catch (cause) { setSaving(false); setError(cause instanceof Error ? cause.message : 'No se pudo finalizar. Tus datos siguen abiertos; intenta de nuevo.') }
  }

  return (
    <main className="flow-page flow-success">

      <div className="flow-container">

        <div className="flow-layout"><VisitContext /><div className="flow-content success-content text-center">

          {/* ÉXITO */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F7F1] text-[#159B72]">
            <Check size={34} />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#EEEAFB] px-3 py-1.5 text-xs font-medium text-[#4B1F91]">
            <Sparkles size={13} />
            Observación procesada
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#172033]">
            Observación guardada
          </h1>
          <p className="mt-3 text-sm font-medium text-blue-700">{record.hospitalName} · {record.area || 'Área no informada'}</p>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8A96A6]">
            La observación está revisada. Guárdala y continúa en el mismo hospital, o finaliza la visita para verla en Mis visitas.
          </p>

          {/* RESUMEN */}
          <section className="success-summary mt-8 rounded-[22px] border border-[#E5EAF0] bg-[#F8F9FC] p-5 text-left">

            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8A96A6]">
              Resumen
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center">

              <Metric
                value={equipment.length}
                label="Detectados"
              />

              <Metric
                value={existingCount}
                label="Vinculados"
              />

              <Metric
                value={newCount}
                label="Nuevos"
              />

            </div>

          </section>

          {/* EQUIPOS */}
          <section className="mt-5 overflow-hidden rounded-[22px] border border-[#E5EAF0] text-left">

            {equipment.map(
              (item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-4 ${
                    index !==
                    equipment.length - 1
                      ? 'border-b border-[#E9EDF2]'
                      : ''
                  }`}
                >

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F7F1] text-[#159B72]">
                    <CheckCircle2 size={17} />
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-semibold text-[#172033]">
                      {item.type ||
                        'Equipo sin especificar'}
                    </p>

                    <p className="mt-1 truncate text-xs text-[#8A96A6]">
                      {item.brand ||
                        'Marca desconocida'}
                      {item.model
                        ? ` · ${item.model}`
                        : ''}
                    </p>

                  </div>

                </div>
              )
            )}

          </section>

          {error && <p role="alert" className="storage-error">{error}</p>}
          {/* CONTINUAR VISITA */}
          <section className="mt-8">

            <button
              disabled={saving}
              onClick={handleAnotherObservation}
              className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl ai-gradient font-medium text-white shadow-lg shadow-[#3437B8]/20 transition hover:-translate-y-0.5"
            >
              <Plus size={19} />

              Añadir otra observación

              <ChevronRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <button
              disabled={saving}
              onClick={handleFinishVisit}
              className="mt-3 flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#E3E8EF] bg-white text-sm font-medium text-[#566276] transition hover:bg-[#F8F9FC]"
            >
              <Home size={17} />

              Finalizar visita
            </button>

          </section>

          <p className="mt-5 text-xs leading-5 text-[#9AA5B4]">
            Puedes seguir agregando observaciones sin
            volver a seleccionar el hospital.
          </p>

        </div>

      </div>

    </div></main>
  )
}

function Metric({
  value,
  label,
}: {
  value: number
  label: string
}) {
  return (
    <div>

      <p className="text-2xl font-semibold tracking-tight text-[#172033]">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-[#8A96A6]">
        {label}
      </p>

    </div>
  )
}

export default SuccessPage
