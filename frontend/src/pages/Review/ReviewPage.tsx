import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CirclePlus,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react'

type EquipmentDraft = {
  id: string
  type: string
  brand: string
  model: string
  configuration: string
  estimatedAge: string
  status: string
  confidence: number
}

function buildDemoExtraction(text: string): EquipmentDraft[] {
  const normalized = text.toLowerCase()

  const extracted: EquipmentDraft[] = []

  const ageMatch = normalized.match(/(\d+)\s*(años|anos)/)
  const detectedAge = ageMatch ? `${ageMatch[1]} años` : ''

  /*
    DEMO:
    Simulación de extracción.

    Después esta función será reemplazada por
    la salida real del modelo local.
  */

  if (
    normalized.includes('dos resonadores') ||
    normalized.includes('2 resonadores')
  ) {
    extracted.push({
      id: 'TEMP-001',
      type: 'Resonador',
      brand: '',
      model: '',
      configuration: '',
      estimatedAge: detectedAge,
      status: 'Desconocido',
      confidence: detectedAge ? 88 : 80,
    })

    extracted.push({
      id: 'TEMP-002',
      type: 'Resonador',
      brand: '',
      model: '',
      configuration: '',
      estimatedAge: '',
      status: 'Desconocido',
      confidence: 76,
    })
  } else if (
    normalized.includes('resonador') ||
    normalized.includes('resonancia')
  ) {
    extracted.push({
      id: 'TEMP-001',
      type: 'Resonador',
      brand: normalized.includes('philips')
        ? 'Philips'
        : normalized.includes('siemens')
          ? 'Siemens'
          : '',
      model: normalized.includes('ingenia') ? 'Ingenia' : '',
      configuration: '',
      estimatedAge: detectedAge,
      status: normalized.includes('operativo')
        ? 'Operativo'
        : 'Desconocido',
      confidence: 87,
    })
  }

  if (
    normalized.includes('tomógrafo') ||
    normalized.includes('tomografo')
  ) {
    extracted.push({
      id: `TEMP-${String(extracted.length + 1).padStart(3, '0')}`,
      type: 'Tomógrafo',
      brand: normalized.includes('siemens') ? 'Siemens' : '',
      model: normalized.includes('somatom') ? 'Somatom' : '',
      configuration: normalized.includes('64 cortes')
        ? '64 cortes'
        : '',
      estimatedAge:
        extracted.length === 0 ? detectedAge : '',
      status: normalized.includes('operativo')
        ? 'Operativo'
        : 'Desconocido',
      confidence: 84,
    })
  }

  if (normalized.includes('ultrasonido')) {
    extracted.push({
      id: `TEMP-${String(extracted.length + 1).padStart(3, '0')}`,
      type: 'Ultrasonido',
      brand: normalized.includes('ge') ? 'GE' : '',
      model: normalized.includes('logiq') ? 'LOGIQ' : '',
      configuration: '',
      estimatedAge: '',
      status: normalized.includes('operativo')
        ? 'Operativo'
        : 'Desconocido',
      confidence: 82,
    })
  }

  /*
    Fallback para nuestra demo anterior.
  */
  if (extracted.length === 0) {
    extracted.push({
      id: 'TEMP-001',
      type: 'Tomógrafo',
      brand: 'Siemens',
      model: 'Somatom',
      configuration: '64 cortes',
      estimatedAge: '8 años',
      status: 'Operativo',
      confidence: 92,
    })
  }

  return extracted
}

function ReviewPage() {
  const navigate = useNavigate()

  const storedObservation = localStorage.getItem(
    'current-observation'
  )

  const observation = storedObservation
    ? JSON.parse(storedObservation)
    : {
        hospitalName: 'Hospital DemoCare Pacific',
        area: 'Radiología',
        observation:
          'Estoy en Hospital DemoCare Pacific, en Panamá. Tienen dos resonadores y un tomógrafo. Uno de los resonadores parece de unos ocho años.',
      }

  const initialEquipment = useMemo(
    () =>
      buildDemoExtraction(
        observation.observation || ''
      ),
    [observation.observation]
  )

  const [equipment, setEquipment] =
    useState<EquipmentDraft[]>(initialEquipment)

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
    const nextNumber = equipment.length + 1

    setEquipment((current) => [
      ...current,
      {
        id: `TEMP-MANUAL-${nextNumber}`,
        type: '',
        brand: '',
        model: '',
        configuration: '',
        estimatedAge: '',
        status: 'Desconocido',
        confidence: 100,
      },
    ])
  }

  const handleConfirm = () => {
    if (equipment.length === 0) return

    const structuredRecord = {
      hospitalName: observation.hospitalName,
      hospitalId: observation.hospitalId,
      area: observation.area,

      originalObservation: observation.observation,

      equipment,

      reviewedAt: new Date().toISOString(),
    }

    localStorage.setItem(
      'current-structured-record',
      JSON.stringify(structuredRecord)
    )

    navigate('/visits/new/match')
  }

  return (
    <main className="min-h-screen bg-[#F3F5F9] md:p-5">
      <div className="mx-auto min-h-screen max-w-[980px] bg-white md:min-h-[calc(100vh-40px)] md:rounded-[28px] md:border md:border-[#E6EAF0] md:shadow-sm">

        {/* HEADER */}
        <header className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-8 md:px-10 md:pt-8">

          <button
            onClick={() =>
              navigate('/visits/new/capture')
            }
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#6F7A8A] transition hover:bg-[#F2F4F8]"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center">
            <p className="text-sm font-bold text-[#0B5ED7]">
              PHILIPS
            </p>

            <p className="mt-0.5 hidden text-[11px] text-[#8A96A6] sm:block">
              Installed Base Intelligence
            </p>
          </div>

          <div className="h-10 w-10" />

        </header>

        <div className="px-6 pb-10 sm:px-8 md:px-10">

          <div className="mx-auto max-w-[760px]">

            {/* INTRO */}
            <section className="pt-4">

              <div className="inline-flex items-center gap-2 rounded-full bg-[#EEEAFB] px-3 py-1.5 text-xs font-medium text-[#4B1F91]">
                <Sparkles size={13} />
                Extracción completada
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#172033] sm:text-4xl">
                {equipment.length} equipos detectados
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

              <div className="mt-4 space-y-4">

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
                    observación.
                  </p>
                </div>

              </div>

            </section>

            {/* CONFIRMAR */}
            <section className="mt-7">

              <button
                onClick={handleConfirm}
                disabled={equipment.length === 0}
                className={`group flex h-14 w-full items-center justify-center gap-3 rounded-2xl font-medium transition ${
                  equipment.length > 0
                    ? 'bg-gradient-to-r from-[#0B5ED7] via-[#3437B8] to-[#4B1F91] text-white shadow-lg shadow-[#3437B8]/20 hover:-translate-y-0.5'
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
              {item.type || 'Equipo sin especificar'}
            </p>

            <div className="mt-1 flex items-center gap-1.5">

              <Sparkles
                size={12}
                className="text-[#4B1F91]"
              />

              <span className="text-xs text-[#756E9D]">
                {item.confidence}% confianza
              </span>

            </div>
          </div>

        </div>

        <button
          onClick={() => onRemove(item.id)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#A1ABB8] transition hover:bg-red-50 hover:text-red-500"
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
  return (
    <div>

      <label className="text-xs font-medium text-[#7D8998]">
        {label}
      </label>

      <div className="relative mt-2">

        <input
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