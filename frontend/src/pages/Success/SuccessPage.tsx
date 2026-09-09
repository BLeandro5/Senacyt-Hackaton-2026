import { useNavigate } from 'react-router-dom'
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Home,
  Plus,
  Sparkles,
} from 'lucide-react'

function SuccessPage() {
  const navigate = useNavigate()

  const storedRecord = localStorage.getItem(
    'current-structured-record'
  )

  const storedMatch = localStorage.getItem(
    'match-result'
  )

  const record = storedRecord
    ? JSON.parse(storedRecord)
    : {
        hospitalName: 'Hospital DemoCare Pacific',
        area: 'Radiología',
        equipment: [],
      }

  const match = storedMatch
    ? JSON.parse(storedMatch)
    : {
        decisions: [],
      }

  const equipment = record.equipment || []
  const decisions = match.decisions || []

  const existingCount = decisions.filter(
    (decision: any) =>
      decision.type === 'existing'
  ).length

  const newCount = decisions.filter(
    (decision: any) => decision.type === 'new'
  ).length

  const handleAnotherObservation = () => {
    /*
      Conservamos current-visit porque seguimos
      dentro del mismo hospital/área.
    */

    localStorage.removeItem(
      'current-observation'
    )

    localStorage.removeItem(
      'current-structured-record'
    )

    localStorage.removeItem('match-result')

    navigate('/visits/new/capture')
  }

  const handleFinishVisit = () => {
    const currentVisit = localStorage.getItem(
      'current-visit'
    )

    localStorage.setItem(
      'last-completed-visit',
      JSON.stringify({
        visit: currentVisit
          ? JSON.parse(currentVisit)
          : null,

        equipmentProcessed: equipment.length,

        existingEquipment: existingCount,

        newEquipment: newCount,

        completedAt: new Date().toISOString(),
      })
    )

    localStorage.removeItem('current-visit')
    localStorage.removeItem(
      'current-observation'
    )
    localStorage.removeItem(
      'current-structured-record'
    )
    localStorage.removeItem('match-result')

    navigate('/home')
  }

  return (
    <main className="min-h-screen bg-[#F3F5F9] md:p-5">

      <div className="mx-auto min-h-screen max-w-[900px] bg-white md:min-h-[calc(100vh-40px)] md:rounded-[28px] md:border md:border-[#E6EAF0]">

        <div className="mx-auto max-w-[600px] px-6 pb-12 pt-14 text-center sm:px-8 md:pt-20">

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

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8A96A6]">
            Los equipos fueron estructurados y
            comparados con la base instalada del
            hospital.
          </p>

          {/* RESUMEN */}
          <section className="mt-8 rounded-[22px] border border-[#E5EAF0] bg-[#F8F9FC] p-5 text-left">

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
              (item: any, index: number) => (
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

          {/* CONTINUAR VISITA */}
          <section className="mt-8">

            <button
              onClick={handleAnotherObservation}
              className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0B5ED7] via-[#3437B8] to-[#4B1F91] font-medium text-white shadow-lg shadow-[#3437B8]/20 transition hover:-translate-y-0.5"
            >
              <Plus size={19} />

              Añadir otra observación

              <ChevronRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <button
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

    </main>
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