import { readStored, writeStored, saveObservation, type RecordDraft } from '../../data/visitStore'
import VisitContext from '../../components/VisitContext'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, CirclePlus, SearchCheck, Sparkles } from 'lucide-react'

type Decision = {
  equipmentId: string
  type: 'existing' | 'new'
  matchedEquipmentId?: string
  similarity?: number
}

function MatchPage() {
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const record = readStored<RecordDraft>('current-structured-record', { hospitalName: '', originalObservation: '', equipment: [] })
  const equipment = record.equipment

  /*
    DEMO:
    Generamos candidatos simulados.

    Después esto vendrá del algoritmo real
    de deduplicación.
  */
  const candidates = equipment.map((item, index) => {
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

  const [decisions, setDecisions] = useState<
    Decision[]
  >(() => readStored<Decision[]>('match-draft',
    candidates
      .filter((candidate) => !candidate.match)
      .map((candidate) => ({
        equipmentId: candidate.equipmentId,
        type: 'new',
      })))
  )
  useEffect(() => {
    try { writeStored('match-draft', decisions) } catch { /* Confirm reports failures. */ }
  }, [decisions])

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

  const allResolved = equipment.length > 0 && equipment.every((item) =>
    isResolved(item.id)
  )

  const handleContinue = () => {
    if (!allResolved) return

    try {
      writeStored('match-result', { decisions })
      saveObservation()
    } catch { setError('No se pudo guardar. Tus decisiones siguen en pantalla; intenta de nuevo.'); return }

    navigate('/visits/new/success')
  }

  return (
    <main className="flow-page flow-match">

      <div className="flow-container">



        <div className="flow-layout">
          <VisitContext />

          <div className="flow-content">
            <button className="back-action" onClick={() => navigate('/visits/new/review')}>← Volver a la revisión</button>

            <section className="pt-4">

              <div className="inline-flex items-center gap-2 rounded-full bg-[#EEEAFB] px-3 py-1.5 text-xs font-medium text-[#4B1F91]">
                <SearchCheck size={14} />
                Verificación demo
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
                    className="comparison rounded-[22px] border border-[#E5EAF0] bg-white p-5"
                  >

                    {/* Equipo observado */}
                    <div><p className="eyebrow mb-4">Equipo observado</p><div className="flex items-start justify-between gap-4">

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

                    <div className="mt-5 grid grid-cols-2 gap-4">
                      <Info label="Marca" value={item.brand || 'Desconocida'} />
                      <Info label="Modelo" value={item.model || 'Desconocido'} />
                      <Info label="Configuración" value={item.configuration || 'No informada'} />
                      <Info label="Edad estimada" value={item.estimatedAge || 'Desconocida'} />
                      <Info label="Estado" value={item.status || 'No informado'} />
                    </div></div>
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
                            {match.similarity}%<span className="block text-[10px] font-normal">Similitud demo</span>
                          </span>

                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">

                          <Info label="Marca" value={match.brand} />
                          <Info label="Modelo" value={match.model} />
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
                            aria-pressed={decision?.type === 'existing'}
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
                                ? 'bg-[#0B5ED7] text-white'
                                : 'border border-[#DDE3EA] bg-white text-[#566276]'
                            }`}
                          >
                            Es el mismo equipo
                          </button>

                          <button
                            aria-pressed={decision?.type === 'new'}
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
                            Es diferente / nuevo
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
                            No encontramos una coincidencia probable
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

            {error && <p role="alert" className="storage-error">{error}</p>}
            {/* CONTINUAR */}
            <section className="mt-7">

              <button
                onClick={handleContinue}
                disabled={!allResolved}
                className={`group flex h-14 w-full items-center justify-center gap-3 rounded-2xl font-medium transition ${
                  allResolved
                    ? 'ai-gradient text-white shadow-lg shadow-[#3437B8]/20'
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
