import { readStored, writeStored, resumePath, clearObservation, type CurrentVisit } from '../../data/visitStore'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, ChevronRight, CircleCheck, Clock3, MapPin, Search, Sparkles } from 'lucide-react'

import { hospitals as cachedHospitals } from '../../data/hospitals'
import { storageRequest } from '../../data/storageApi'

const areas = [
  'Radiología',
  'Imagenología',
  'Cardiología',
  'Urgencias',
  'UCI',
  'Quirófano',
  'Otra',
]

function NewVisitPage() {
  const navigate = useNavigate()

  const current = readStored<CurrentVisit | null>('current-visit', null)
  const [error, setError] = useState('')
  const [hospitals, setHospitals] = useState(cachedHospitals)
  useEffect(() => {
    let active = true
    storageRequest<typeof cachedHospitals>('/hospitals').then(data => { if (active) setHospitals(data) })
      .catch(() => { if (active) setError('No se pudo cargar el catálogo de SQLite. Mostrando hospitales locales; comprueba el backend antes de guardar.') })
    return () => { active = false }
  }, [])
  const [search, setSearch] = useState('')
  const [selectedHospitalId, setSelectedHospitalId] = useState('')
  const [area, setArea] = useState('')

  const filteredHospitals = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return hospitals
    }

    return hospitals.filter((hospital) => {
      return (
        hospital.name.toLowerCase().includes(query) ||
        hospital.region.toLowerCase().includes(query)
      )
    })
  }, [search, hospitals])

  const selectedHospital = hospitals.find(
    (hospital) => hospital.id === selectedHospitalId,
  )

  const canContinue = Boolean(selectedHospital)

  const handleContinue = () => {
    if (!selectedHospital) return

    if (current) { navigate(resumePath()); return }
    const visit = {
      id: crypto.randomUUID(),
      observations: [],
      hospitalId: selectedHospital.id,
      hospitalName: selectedHospital.name,
      region: selectedHospital.region,
      area: area || '',
      startedAt: new Date().toISOString(),
    }

    try { writeStored('current-visit', visit); clearObservation() }
    catch { setError('No se pudo guardar la visita. Comprueba el espacio disponible e intenta de nuevo.'); return }

    navigate('/visits/new/capture')
  }

  return (
    <div className="min-h-screen bg-[#F3F5F9] text-slate-950">
      {/* Header */}


      <main className="mx-auto max-w-[1380px] px-4 pb-32 pt-7 sm:px-6 lg:px-8 lg:pb-10 lg:pt-9">
        {error && <p role="alert" className="storage-error">{error}</p>}
        {current && <section className="panel mb-6"><h2 className="font-semibold">Ya tienes una visita en progreso</h2><p className="my-3 text-sm">{current.hospitalName}. Continúa esta visita y finalízala antes de comenzar otra.</p><button className="rounded-xl bg-blue-700 px-4 py-3 text-white" onClick={() => navigate(resumePath())}>Continuar visita actual</button></section>}
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0B5ED7]">
              Ubicación de la visita
            </span>

            <span className="text-slate-400">
              Siguiente: captura
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 rounded-full bg-[#0B5ED7]" />
          </div>
        </div>

        {/* Intro */}
        <section className="mb-7">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#0B5ED7] lg:hidden">
            <MapPin size={21} />
          </div>

          <p className="hidden text-sm font-semibold text-[#0B5ED7] lg:block">
            Comienza una nueva visita
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            ¿Dónde estás?
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Selecciona el hospital que estás visitando. Esta información
            ayudará a asociar correctamente los equipos que registres.
          </p>
        </section>

        {/* Desktop grid */}
        <section className="grid gap-5 lg:grid-cols-12 lg:items-start">
          {/* Hospital selector */}
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Selecciona un hospital
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Busca por nombre o revisa los centros recientes.
                </p>
              </div>

              <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0B5ED7] sm:flex">
                <Building2 size={19} />
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-5">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                aria-label="Buscar hospital"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar hospital..."
                className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B5ED7] focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Recent label */}
            <div className="mb-3 mt-6 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {search ? 'Resultados' : 'Hospitales recientes'}
              </p>

              <span className="text-xs text-slate-400">
                {filteredHospitals.length}{' '}
                {filteredHospitals.length === 1
                  ? 'hospital'
                  : 'hospitales'}
              </span>
            </div>

            {/* Hospitals */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              {filteredHospitals.length > 0 ? (
                filteredHospitals.map((hospital, index) => {
                  const selected =
                    selectedHospitalId === hospital.id

                  return (
                    <button
                      key={hospital.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setSelectedHospitalId(hospital.id)
                      }
                      className={`group flex w-full items-center gap-4 px-4 py-4 text-left transition sm:px-5 ${
                        selected
                          ? 'bg-blue-50/70'
                          : 'bg-white hover:bg-slate-50'
                      } ${
                        index !== filteredHospitals.length - 1
                          ? 'border-b border-slate-100'
                          : ''
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                          selected
                            ? 'bg-[#0B5ED7] text-white'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-[#0B5ED7]'
                        }`}
                      >
                        <Building2 size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold ${
                            selected
                              ? 'text-[#0B5ED7]'
                              : 'text-slate-950'
                          }`}
                        >
                          {hospital.name}
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <MapPin size={13} />
                          {hospital.region}
                        </p>
                      </div>

                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                          selected
                            ? 'border-[#0B5ED7] bg-[#0B5ED7] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selected && <Check size={14} />}
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="px-5 py-12 text-center">
                  <Search
                    size={30}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    No encontramos hospitales
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Intenta con otro nombre.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Desktop visit summary */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-6 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div
                className="relative overflow-hidden px-6 py-6 text-white"
                style={{
                  background:
                    '#0B5ED7',
                }}
              >
                <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full border border-white/10" />

                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                    <Sparkles size={20} />
                  </div>

                  <p className="mt-5 text-xs font-medium uppercase tracking-[0.15em] text-white/70">
                    Resumen de la visita
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    {selectedHospital
                      ? 'Ubicación seleccionada'
                      : 'Prepara tu visita'}
                  </h2>
                </div>
              </div>

              <div className="p-6">
                {/* Selected hospital */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Hospital
                  </p>

                  {selectedHospital ? (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0B5ED7] shadow-sm">
                        <Building2 size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {selectedHospital.name}
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin size={12} />
                          {selectedHospital.region}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center">
                      <Building2
                        size={24}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Selecciona un hospital para continuar.
                      </p>
                    </div>
                  )}
                </div>

                {/* Area */}
                <div className="mt-6">
                  <label
                    htmlFor="visit-area"
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
                  >
                    Área
                    <span className="ml-1 normal-case tracking-normal text-slate-300">
                      opcional
                    </span>
                  </label>

                  <select
                    id="visit-area"
                    value={area}
                    onChange={(event) =>
                      setArea(event.target.value)
                    }
                    className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[#0B5ED7] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">
                      Seleccionar área
                    </option>

                    {areas.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Info */}
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <Clock3
                    size={18}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <p className="text-xs leading-5 text-slate-500">
                    La visita comenzará cuando continúes. Podrás
                    registrar varias observaciones dentro del mismo
                    hospital.
                  </p>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={handleContinue}
                  className={`mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                    canContinue
                      ? 'bg-[#0B5ED7] text-white shadow-sm hover:bg-[#0954C4]'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                >
                  Continuar
                  <ChevronRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="mt-2 w-full py-2 text-xs font-medium text-slate-400 transition hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </aside>
        </section>

        {/* Mobile area */}
        <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <MapPin size={18} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Área del hospital
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Opcional
              </p>
            </div>
          </div>

          <select
            aria-label="Área del hospital (opcional)"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="mt-4 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#0B5ED7] focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Seleccionar área</option>

            {areas.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </section>

        {/* Mobile selected status */}
        {selectedHospital && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 lg:hidden">
            <CircleCheck
              size={20}
              className="shrink-0 text-[#0B5ED7]"
            />

            <div className="min-w-0">
              <p className="text-xs text-blue-600">
                Hospital seleccionado
              </p>

              <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">
                {selectedHospital.name}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Mobile actions */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="h-12 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinue}
            className={`flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
              canContinue
                ? 'bg-[#0B5ED7] text-white shadow-sm'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            }`}
          >
            Continuar
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </div>
  )
}

export default NewVisitPage
