import {
  toEquipmentDrafts,
  type EquipmentDraft,
  type ReliabilityPreview,
} from '../../data/observationApi'
import {
  readStored,
  writeStored,
  type Capture,
} from '../../data/visitStore'
import VisitContext from '../../components/VisitContext'
import FollowUp from '../../components/FollowUp'
import { useEffect, useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  CirclePlus,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'

function ReviewPage() {
  const navigate = useNavigate()

  const [error, setError] = useState('')
  const observation = readStored<Capture>('current-observation', {
    hospitalName: '',
    observation: '',
    captureMode: 'chat',
    capturedAt: '',
  })

  const initialEquipment = useMemo(
    () =>
      observation.analysis?.original_text === observation.observation
        ? toEquipmentDrafts(observation.analysis)
        : [],
    [observation.analysis, observation.observation]
  )

  const [equipment, setEquipment] = useState<EquipmentDraft[]>(() => {
    if (
      observation.analysis?.original_text !== observation.observation
    ) {
      return []
    }

    const stored = readStored<EquipmentDraft[]>(
      'review-draft',
      initialEquipment
    )

    // A draft created before reliability previews existed may not contain
    // metadata. Rehydrate it from the current analysis by position.
    return stored.map((item, index) => ({
      ...item,
      evidenceStatus:
        item.evidenceStatus ??
        initialEquipment[index]?.evidenceStatus,
      reliability:
        item.reliability ??
        initialEquipment[index]?.reliability,
    }))
  })

  useEffect(() => {
    try {
      writeStored('review-draft', equipment)
    } catch {
      // Report on confirm; keep edits in memory.
    }
  }, [equipment])

  const updateEquipment = (
    id: string,
    field: keyof EquipmentDraft,
    value: string
  ) => {
    setEquipment((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
              // The preview belongs to the original extraction. Once a
              // collaborator changes a field, the backend will calculate the
              // definitive reliability again when the visit is saved.
              reliability: undefined,
              evidenceStatus: undefined,
            }
          : item
      )
    )
  }

  const removeEquipment = (id: string) => {
    setEquipment((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  const addEquipment = () => {
    setEquipment((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: '',
        brand: '',
        model: '',
        configuration: '',
        estimatedAge: '',
        status: 'Desconocido',
      },
    ])
  }

  const handleConfirm = () => {
    if (equipment.length === 0) return

    const structuredRecord = {
      observationId: observation.id,
      hospitalName: observation.hospitalName,
      hospitalId: observation.hospitalId,
      area: observation.area,

      originalObservation: observation.observation,

      equipment: equipment.map((item) => ({
        ...item,
        reviewed: true,
      })),

      reviewedAt: new Date().toISOString(),
    }

    try {
      writeStored(
        'current-structured-record',
        structuredRecord
      )
      localStorage.removeItem('match-result')
      localStorage.removeItem('match-draft')
    } catch {
      setError(
        'No se pudo guardar la revisión. Tus cambios siguen en pantalla; libera espacio y reintenta.'
      )
      return
    }

    navigate('/visits/new/match')
  }

  const hasReliabilityPreview = equipment.some(
    (item) => item.reliability
  )

  return (
    <main className="flow-page flow-review">
      <div className="flow-container">
        <div className="flow-layout">
          <VisitContext />

          <div className="flow-content">
            <button
              className="back-action"
              onClick={() =>
                navigate('/visits/new/capture')
              }
            >
              ← Volver a la captura
            </button>

            {/* INTRO */}
            <section className="pt-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EEEAFB] px-3 py-1.5 text-xs font-medium text-[#4B1F91]">
                <Sparkles size={13} />
                {observation.analysis
                  ? 'Extracción local con MedPsy'
                  : 'Observación pendiente de análisis'}
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#172033] sm:text-4xl">
                La IA detectó {equipment.length}{' '}
                {equipment.length === 1
                  ? 'equipo'
                  : 'equipos'}
              </h1>

              <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#6F7A8A]">
                Separamos los equipos mencionados en tu
                observación. Revisa los datos antes de
                continuar.
              </p>
            </section>

            {/* OBSERVACIÓN ORIGINAL */}
            <section className="mt-7 rounded-2xl border border-[#E5EAF0] bg-[#F8F9FC] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8A96A6]">
                Observación original
              </p>

              <p className="mt-3 text-sm leading-6 text-[#566276]">
                “{observation.observation}”
              </p>
            </section>

            {/* EXPLICACIÓN DE CONFIABILIDAD */}
            {hasReliabilityPreview && (
              <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B5ED7] shadow-sm">
                    <ShieldCheck size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#172033]">
                      Confiabilidad preliminar activa
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#6F7A8A]">
                      El puntaje se calcula con reglas
                      deterministas sobre la calidad de la
                      información, validación humana,
                      recencia, corroboración y conflictos.
                      No es una probabilidad generada por
                      MedPsy.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <FollowUp
              observationId={
                observation.id ||
                observation.capturedAt
              }
              equipment={equipment}
              update={updateEquipment}
            />

            {/* EQUIPOS */}
            <section className="mt-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">
                    Equipos encontrados
                  </h2>

                  <p className="mt-1 text-sm text-[#8A96A6]">
                    Los campos desconocidos pueden quedar
                    sin especificar.
                  </p>
                </div>

                <button
                  onClick={addEquipment}
                  className="flex shrink-0 items-center gap-2 text-sm font-medium text-[#0B5ED7]"
                >
                  <CirclePlus size={17} />
                  Agregar
                </button>
              </div>

              <div className="mt-4 equipment-grid">
                {equipment.map((item, index) => (
                  <EquipmentCard
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={updateEquipment}
                    onRemove={removeEquipment}
                  />
                ))}
              </div>

              {equipment.length === 0 && (
                <div className="mt-4 rounded-2xl border border-dashed border-[#DCE2EA] px-6 py-10 text-center">
                  <p className="text-sm font-medium text-[#566276]">
                    No hay equipos para confirmar.
                  </p>

                  <button
                    onClick={addEquipment}
                    className="mt-3 text-sm font-medium text-[#0B5ED7]"
                  >
                    + Agregar equipo manualmente
                  </button>
                </div>
              )}
            </section>

            {/* CONTROL HUMANO */}
            <section className="mt-6 rounded-2xl border border-[#E3E0F4] bg-[#FAF9FF] px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEEAFB] text-[#4B1F91]">
                  <Sparkles size={17} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#172033]">
                    La IA no completa lo que no sabe
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#7D8998]">
                    Los atributos no mencionados permanecen
                    como desconocidos hasta una futura
                    observación. Al guardar la visita, la
                    confiabilidad se recalcula con la
                    revisión humana y las evidencias
                    disponibles.
                  </p>
                </div>
              </div>
            </section>

            {error && (
              <p
                role="alert"
                className="storage-error"
              >
                {error}
              </p>
            )}

            {/* CONFIRMAR */}
            <section className="mt-7">
              <button
                onClick={handleConfirm}
                disabled={equipment.length === 0}
                className={`group flex h-14 w-full items-center justify-center gap-3 rounded-2xl font-medium transition ${
                  equipment.length > 0
                    ? 'ai-gradient text-white shadow-lg shadow-[#3437B8]/20 hover:-translate-y-0.5'
                    : 'cursor-not-allowed bg-[#EEF1F5] text-[#A1ABB8]'
                }`}
              >
                <Check size={19} />

                Confirmar {equipment.length}{' '}
                {equipment.length === 1
                  ? 'equipo'
                  : 'equipos'}

                <ChevronRight
                  size={19}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>

              <button
                onClick={() =>
                  navigate('/visits/new/capture')
                }
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 text-sm font-medium text-[#6F7A8A]"
              >
                <Pencil size={16} />
                Volver a la observación
              </button>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

type EquipmentCardProps = {
  item: EquipmentDraft
  index: number
  onChange: (
    id: string,
    field: keyof EquipmentDraft,
    value: string
  ) => void
  onRemove: (id: string) => void
}

function EquipmentCard({
  item,
  index,
  onChange,
  onRemove,
}: EquipmentCardProps) {
  return (
    <div className="rounded-[22px] border border-[#E5EAF0] bg-white p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF0FF] text-sm font-semibold text-[#3437B8]">
            {index + 1}
          </div>

          <div>
            <p className="text-sm font-semibold text-[#172033]">
              {item.type ||
                'Equipo sin especificar'}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
              <Sparkles
                size={12}
                className="text-[#4B1F91]"
              />

              <span className="text-xs text-[#756E9D]">
                {item.id.startsWith('MEDPSY-')
                  ? 'Extraído por MedPsy · revisar'
                  : 'Añadido manualmente'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#A1ABB8] transition hover:bg-red-50 hover:text-red-500"
          aria-label={`Eliminar equipo ${index + 1}`}
          title="Eliminar equipo"
        >
          <Trash2 size={17} />
        </button>
      </div>

      {/* Campos */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Tipo de equipo"
          value={item.type}
          placeholder="No especificado"
          onChange={(value) =>
            onChange(item.id, 'type', value)
          }
        />

        <Field
          label="Marca"
          value={item.brand}
          placeholder="No especificada"
          onChange={(value) =>
            onChange(item.id, 'brand', value)
          }
        />

        <Field
          label="Modelo"
          value={item.model}
          placeholder="No especificado"
          onChange={(value) =>
            onChange(item.id, 'model', value)
          }
        />

        <Field
          label="Configuración"
          value={item.configuration}
          placeholder="No especificada"
          onChange={(value) =>
            onChange(
              item.id,
              'configuration',
              value
            )
          }
        />

        <Field
          label="Antigüedad estimada"
          value={item.estimatedAge}
          placeholder="Desconocida"
          onChange={(value) =>
            onChange(
              item.id,
              'estimatedAge',
              value
            )
          }
        />

        <div>
          <label className="text-xs font-medium text-[#7D8998]">
            Estado
          </label>

          <select
            aria-label={`Estado del equipo ${index + 1}`}
            value={item.status}
            onChange={(event) =>
              onChange(
                item.id,
                'status',
                event.target.value
              )
            }
            className="mt-2 h-12 w-full rounded-xl border border-[#E3E8EF] bg-[#FBFCFD] px-3 text-sm text-[#172033] outline-none focus:border-[#3437B8] focus:ring-4 focus:ring-[#EEF0FF]"
          >
            <option>Desconocido</option>
            <option>Operativo</option>
            <option>Con observaciones</option>
            <option>Fuera de servicio</option>
          </select>
        </div>
      </div>

      {item.reliability ? (
        <ReliabilityPanel
          reliability={item.reliability}
        />
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[#DCE2EA] bg-[#FBFCFD] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={18}
              className="mt-0.5 shrink-0 text-[#8A96A6]"
            />

            <div>
              <p className="text-sm font-medium text-[#566276]">
                Confiabilidad pendiente de
                recálculo
              </p>

              <p className="mt-1 text-xs leading-5 text-[#8A96A6]">
                Este equipo fue agregado o modificado
                durante la revisión. El backend calculará
                nuevamente su confiabilidad cuando se
                guarde la visita.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReliabilityPanel({
  reliability,
}: {
  reliability: ReliabilityPreview
}) {
  const levelConfig = {
    High: {
      label: 'Alta',
      badge:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
      bar: 'bg-emerald-500',
    },
    Medium: {
      label: 'Media',
      badge:
        'border-amber-200 bg-amber-50 text-amber-700',
      bar: 'bg-amber-500',
    },
    Low: {
      label: 'Baja',
      badge:
        'border-rose-200 bg-rose-50 text-rose-700',
      bar: 'bg-rose-500',
    },
  } as const

  const config = levelConfig[reliability.level]
  const breakdown = reliability.breakdown

  const factors: Record<string, string> = {
    modality: 'Modalidad identificada',
    exact_quantity: 'Cantidad exacta',
    estimated_quantity: 'Cantidad estimada',
    manufacturer: 'Fabricante identificado',
    model: 'Modelo identificado',
    configuration: 'Configuración informada',
    condition: 'Estado informado',
    exact_age: 'Antigüedad exacta',
    estimated_age: 'Antigüedad estimada',
  }

  return (
    <section className="mt-5 rounded-2xl border border-[#E3E8EF] bg-[#FBFCFD] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7]">
            <ShieldCheck size={19} />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8A96A6]">
              Confiabilidad preliminar
            </p>

            <p className="mt-1 text-xl font-semibold text-[#172033]">
              {reliability.score}/100
            </p>
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${config.badge}`}
        >
          {config.label}
        </span>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-[#E9EDF2]"
        aria-label={`Confiabilidad ${reliability.score} de 100`}
      >
        <div
          className={`h-full rounded-full ${config.bar}`}
          style={{
            width: `${Math.max(
              0,
              Math.min(100, reliability.score)
            )}%`,
          }}
        />
      </div>

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <BreakdownRow
          label="Calidad de información"
          value={breakdown.informationQuality}
          max={45}
        />

        <BreakdownRow
          label="Validación humana"
          value={breakdown.humanValidation}
          max={15}
        />

        <BreakdownRow
          label="Recencia"
          value={breakdown.freshness}
          max={15}
        />

        <BreakdownRow
          label="Corroboración"
          value={breakdown.corroboration}
          max={25}
        />

        <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[#566276] sm:col-span-2">
          <span>Penalización por conflicto</span>
          <strong
            className={
              breakdown.conflictPenalty < 0
                ? 'text-rose-600'
                : 'text-[#172033]'
            }
          >
            {breakdown.conflictPenalty}
          </strong>
        </div>
      </div>

      {reliability.factors.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-[#0B5ED7]">
            Ver factores aplicados
          </summary>

          <div className="mt-3 flex flex-wrap gap-2">
            {reliability.factors.map((factor) => (
              <span
                key={factor}
                className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[11px] text-[#566276]"
              >
                {factors[factor] || factor}
              </span>
            ))}
          </div>
        </details>
      )}

      <p className="mt-4 text-[11px] leading-5 text-[#8A96A6]">
        Vista preliminar antes de la confirmación humana.
        El puntaje definitivo se recalcula al guardar con
        las evidencias disponibles.
      </p>
    </section>
  )
}

function BreakdownRow({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[#566276]">
      <span>{label}</span>
      <strong className="text-[#172033]">
        {value}/{max}
      </strong>
    </div>
  )
}

type FieldProps = {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: FieldProps) {
  const fieldId = useId()

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="text-xs font-medium text-[#7D8998]"
      >
        {label}
      </label>

      <div className ="relative mt-2">
        <input
          id={fieldId}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-[#E3E8EF] bg-[#FBFCFD] px-3 pr-9 text-sm font-medium text-[#172033] outline-none placeholder:font-normal placeholder:text-[#A1ABB8] focus:border-[#3437B8] focus:bg-white focus:ring-4 focus:ring-[#EEF0FF]"
        />

        <Pencil
          size={13}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B1BAC6]"
        />
      </div>
    </div>
  )
}

export default ReviewPage
