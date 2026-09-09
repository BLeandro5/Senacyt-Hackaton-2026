import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CirclePlus,
  SearchCheck,
  Sparkles,
} from 'lucide-react'

type Equipment = {
  id: string
  type: string
  brand: string
  model: string
  configuration: string
  estimatedAge: string
  status: string
  confidence: number
}

type Decision = {
  equipmentId: string
  type: 'existing' | 'new'
  matchedEquipmentId?: string
  similarity?: number
}

function MatchPage() {
  const navigate = useNavigate()

  const storedRecord = localStorage.getItem(
    'current-structured-record'
  )

  const record = storedRecord
    ? JSON.parse(storedRecord)
    : {
        hospitalName: 'Hospital DemoCare Pacific',
        area: 'Radiología',

        equipment: [
          {
            id: 'TEMP-001',
            type: 'Resonador',
            brand: '',
            model: '',
            configuration: '',
            estimatedAge: '8 años',
            status: 'Desconocido',
            confidence: 88,
          },
          {
            id: 'TEMP-002',
            type: 'Resonador',
            brand: '',
            model: '',
            configuration: '',
            estimatedAge: '',
            status: 'Desconocido',
            confidence: 76,
          },
          {
            id: 'TEMP-003',
            type: 'Tomógrafo',
            brand: '',
            model: '',
            configuration: '',
            estimatedAge: '',
            status: 'Desconocido',
            confidence: 84,
          },
        ],
      }

  const equipment: Equipment[] =
    record.equipment || []

  /*
    DEMO:
    Generamos candidatos simulados.

    Después esto vendrá del algoritmo real
    de deduplicación.
  */
  const candidates = useMemo(() => {
    return equipment.map((item, index) => {
      if (index === 0 && item.type === 'Resonador') {
        return {
          equipmentId: item.id,
          match: {
            id: 'EQ-00421',
            type: 'Resonador',
            brand: 'Desconocida',
            model: 'Desconocido',
            area: record.area,
            lastSeen: '12 mayo 2026',
            similarity: 82,
          },
        }
      }

      if (item.type === 'Tomógrafo') {
        return {
          equipmentId: item.id,
          match: {
            id: 'EQ-00128',
            type: 'Tomógrafo',
            brand: 'Desconocida',
            model: 'Desconocido',
            area: record.area,
            lastSeen: '14 junio 2026',
            similarity: 88,
          },
        }
      }

      return {
        equipmentId: item.id,
        match: null,
      }
    })
  }, [equipment, record.area])

  const [decisions, setDecisions] = useState<
    Decision[]
  >(() =>
    candidates
      .filter((candidate) => !candidate.match)
      .map((candidate) => ({
        equipmentId: candidate.equipmentId,
        type: 'new',
      }))
  )

  const setDecision = (
    equipmentId: string,
    decision: Decision
  ) => {
    setDecisions((current) => [
      ...current.filter(
        (item) =>
          item.equipmentId !== equipmentId
      ),
      decision,
    ])
  }

  const isResolved = (equipmentId: string) =>
    decisions.some(
      (decision) =>
        decision.equipmentId === equipmentId
    )

  const allResolved = equipment.every((item) =>
    isResolved(item.id)
  )

  const handleContinue = () => {
    if (!allResolved) return

    localStorage.setItem(
      'match-result',
      JSON.stringify({
        decisions,
      })
    )

    navigate('/visits/new/success')
  }

  return (
    <main className="min-h-screen bg-[#F3F5F9] md:p-5">

      <div className="mx-auto min-h-screen max-w-[980px] bg-white md:min-h-[calc(100vh-40px)] md:rounded-[28px] md:border md:border-[#E6EAF0] md:shadow-sm">

        <header className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-8 md:px-10 md:pt-8">

          <button
            onClick={() =>
              navigate('/visits/new/review')
            }
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#6F7A8A] hover:bg-[#F2F4F8]"
          >
            <ArrowLeft size={20} />
          </button>

          <p className="text-sm font-bold text-[#0B5ED7]">
            PHILIPS
          </p>

          <div className="h-10 w-10" />

        </header>

        <div className="px-6 pb-10 sm:px-8 md:px-10">

          <div className="mx-auto max-w-[760px]">

            <section className="pt-4">

              <div className="inline-flex items-center gap-2 rounded-full bg-[#EEEAFB] px-3 py-1.5 text-xs font-medium text-[#4B1F91]">
                <SearchCheck size={14} />
                Verificación
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#172033] sm:text-4xl">
                Revisemos coincidencias
              </h1>

              <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#6F7A8A]">
                Cada equipo se compara individualmente
                con la base instalada de{' '}
                {record.hospitalName}.
              </p>

            </section>

            <section className="mt-7 space-y-4">

              {equipment.map((item, index) => {
                const candidate = candidates.find(
                  (candidate) =>
                    candidate.equipmentId === item.id
                )

                const match = candidate?.match

                const decision = decisions.find(
                  (decision) =>
                    decision.equipmentId === item.id
                )

                return (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-[#E5EAF0] bg-white p-5"
                  >

                    {/* Equipo */}
                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FF] font-semibold text-[#0B5ED7]">
                          {index + 1}
                        </div>

                        <div>

                          <p className="text-base font-semibold text-[#172033]">
                            {item.type ||
                              'Equipo sin especificar'}
                          </p>

                          <p className="mt-1 text-xs text-[#8A96A6]">
                            {item.brand ||
                              'Marca desconocida'}
                            {item.model
                              ? ` · ${item.model}`
                              : ''}
                          </p>

                        </div>

                      </div>

                      {decision && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F7F1] text-[#159B72]">
                          <Check size={16} />
                        </div>
                      )}

                    </div>

                    {/* Candidato */}
                    {match ? (
                      <div className="mt-5 rounded-2xl border border-[#E3E0F4] bg-[#FAF9FF] p-4">

                        <div className="flex items-center justify-between gap-4">

                          <div className="flex items-center gap-2">

                            <Sparkles
                              size={16}
                              className="text-[#4B1F91]"
                            />

                            <p className="text-sm font-semibold text-[#172033]">
                              Posible coincidencia
                            </p>

                          </div>

                          <span className="text-lg font-semibold text-[#4B1F91]">
                            {match.similarity}%
                          </span>

                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">

                          <Info
                            label="Registro"
                            value={match.id}
                          />

                          <Info
                            label="Tipo"
                            value={match.type}
                          />

                          <Info
                            label="Área"
                            value={
                              match.area ||
                              'Desconocida'
                            }
                          />

                          <Info
                            label="Última observación"
                            value={match.lastSeen}
                          />

                        </div>

                        <div className="mt-5 grid gap-2 sm:grid-cols-2">

                          <button
                            onClick={() =>
                              setDecision(item.id, {
                                equipmentId:
                                  item.id,
                                type: 'existing',
                                matchedEquipmentId:
                                  match.id,
                                similarity:
                                  match.similarity,
                              })
                            }
                            className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                              decision?.type ===
                              'existing'
                                ? 'bg-gradient-to-r from-[#0B5ED7] to-[#4B1F91] text-white'
                                : 'border border-[#DDE3EA] bg-white text-[#566276]'
                            }`}
                          >
                            Es el mismo
                          </button>

                          <button
                            onClick={() =>
                              setDecision(item.id, {
                                equipmentId:
                                  item.id,
                                type: 'new',
                              })
                            }
                            className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                              decision?.type ===
                              'new'
                                ? 'bg-[#172033] text-white'
                                : 'border border-[#DDE3EA] bg-white text-[#566276]'
                            }`}
                          >
                            Es otro equipo
                          </button>

                        </div>

                      </div>
                    ) : (
                      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#F5FAF8] p-4">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F7F1] text-[#159B72]">
                          <CirclePlus size={17} />
                        </div>

                        <div>

                          <p className="text-sm font-semibold text-[#172033]">
                            Sin coincidencia clara
                          </p>

                          <p className="mt-1 text-sm leading-6 text-[#7D8998]">
                            Se propone crear un nuevo
                            equipo.
                          </p>

                        </div>

                      </div>
                    )}

                  </div>
                )
              })}

            </section>

            {/* CONTINUAR */}
            <section className="mt-7">

              <button
                onClick={handleContinue}
                disabled={!allResolved}
                className={`group flex h-14 w-full items-center justify-center gap-3 rounded-2xl font-medium transition ${
                  allResolved
                    ? 'bg-gradient-to-r from-[#0B5ED7] via-[#3437B8] to-[#4B1F91] text-white shadow-lg shadow-[#3437B8]/20'
                    : 'cursor-not-allowed bg-[#EEF1F5] text-[#A1ABB8]'
                }`}
              >
                Confirmar coincidencias

                <ChevronRight
                  size={19}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>

              {!allResolved && (
                <p className="mt-3 text-center text-xs text-[#9AA5B4]">
                  Decide qué hacer con cada coincidencia
                  antes de continuar.
                </p>
              )}

            </section>

          </div>

        </div>

      </div>

    </main>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>

      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#9AA5B4]">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-[#172033]">
        {value}
      </p>

    </div>
  )
}

export default MatchPage
