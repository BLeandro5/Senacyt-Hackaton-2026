import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
} from 'lucide-react'

import { hospitals } from '../../data/hospitals'

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

  const [search, setSearch] = useState('')
  const [selectedHospitalId, setSelectedHospitalId] = useState('')
  const [selectedArea, setSelectedArea] = useState('')

  const filteredHospitals = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return hospitals.slice(0, 4)
    }

    return hospitals.filter((hospital) =>
      `${hospital.name} ${hospital.region} ${hospital.city}`
        .toLowerCase()
        .includes(query)
    )
  }, [search])

  const selectedHospital = hospitals.find(
    (hospital) => hospital.id === selectedHospitalId
  )

  const handleContinue = () => {
    if (!selectedHospital) return

    localStorage.setItem(
      'current-visit',
      JSON.stringify({
        hospitalId: selectedHospital.id,
        hospitalName: selectedHospital.name,
        region: selectedHospital.region,
        area: selectedArea || null,
        startedAt: new Date().toISOString(),
      })
    )

    navigate('/visits/new/capture')
  }

  return (
    <main className="min-h-screen bg-[#F3F5F9] md:p-5">
      <div className="mx-auto min-h-screen max-w-[980px] bg-white md:min-h-[calc(100vh-40px)] md:rounded-[28px] md:border md:border-[#E6EAF0] md:shadow-sm">

        {/* HEADER */}
        <header className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-8 md:px-10 md:pt-8">

          <button
            onClick={() => navigate('/home')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#6F7A8A] transition hover:bg-[#F2F4F8] hover:text-[#172033]"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center">
            <p className="text-sm font-bold tracking-tight text-[#0B5ED7]">
              PHILIPS
            </p>

            <p className="mt-0.5 hidden text-[11px] text-[#8A96A6] sm:block">
              Installed Base Intelligence
            </p>
          </div>

          <div className="h-10 w-10" />

        </header>

        {/* CONTENIDO */}
        <div className="px-6 pb-10 sm:px-8 md:px-10">

          <div className="mx-auto max-w-[700px]">

            {/* PASO */}
            <section className="pt-4">

              <div className="flex items-center justify-between">

                <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-3 py-1.5 text-xs font-medium text-[#3437B8]">
                  Paso 1 de 2
                </div>

                <span className="text-xs text-[#9AA5B4]">
                  Configurar visita
                </span>

              </div>

              {/* Barra de progreso */}
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#EEF1F5]">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#0B5ED7] to-[#4B1F91]" />
              </div>

              <h1 className="mt-7 text-3xl font-semibold tracking-tight text-[#172033] sm:text-4xl">
                ¿Dónde estás?
              </h1>

              <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#6F7A8A]">
                Selecciona el hospital antes de comenzar a registrar los equipos
                que observes.
              </p>

            </section>

            {/* BUSCADOR */}
            <section className="mt-8">

              <label
                htmlFor="hospital-search"
                className="text-sm font-semibold text-[#172033]"
              >
                Hospital
              </label>

              <div className="relative mt-2">

                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA5B4]"
                />

                <input
                  id="hospital-search"
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar hospital..."
                  className="h-14 w-full rounded-2xl border border-[#E2E7EE] bg-white pl-12 pr-4 text-[#172033] outline-none transition placeholder:text-[#A1ABB8] focus:border-[#0B5ED7] focus:ring-4 focus:ring-[#EAF2FF]"
                />

              </div>

            </section>

            {/* LISTA HOSPITALES */}
            <section className="mt-4">

              <div className="mb-3 flex items-center justify-between">

                <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8A96A6]">
                  {search ? 'Resultados' : 'Hospitales recientes'}
                </p>

                <span className="text-xs text-[#A1ABB8]">
                  {filteredHospitals.length} encontrados
                </span>

              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white">

                {filteredHospitals.length > 0 ? (
                  filteredHospitals.map((hospital, index) => {
                    const isSelected =
                      hospital.id === selectedHospitalId

                    return (
                      <button
                        key={hospital.id}
                        onClick={() =>
                          setSelectedHospitalId(hospital.id)
                        }
                        className={`flex w-full items-center gap-4 px-4 py-4 text-left transition ${
                          isSelected
                            ? 'bg-[#F3F5FF]'
                            : 'bg-white hover:bg-[#F8F9FC]'
                        } ${
                          index !== filteredHospitals.length - 1
                            ? 'border-b border-[#E9EDF2]'
                            : ''
                        }`}
                      >

                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                            isSelected
                              ? 'bg-gradient-to-br from-[#0B5ED7] to-[#4B1F91] text-white'
                              : 'bg-[#EAF2FF] text-[#0B5ED7]'
                          }`}
                        >
                          <Building2 size={20} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-sm font-semibold text-[#172033]">
                            {hospital.name}
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8A96A6]">
                            <MapPin size={12} />
                            <span>{hospital.region}</span>
                          </div>

                        </div>

                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                            isSelected
                              ? 'border-[#3437B8] bg-[#3437B8] text-white'
                              : 'border-[#DCE2EA] text-transparent'
                          }`}
                        >
                          <Check size={14} />
                        </div>

                      </button>
                    )
                  })
                ) : (
                  <div className="px-6 py-10 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F4F8] text-[#A1ABB8]">
                      <Building2 size={22} />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-[#172033]">
                      No encontramos ese hospital
                    </p>

                    <p className="mt-1 text-sm text-[#8A96A6]">
                      Intenta escribir otro nombre.
                    </p>

                  </div>
                )}

              </div>

            </section>

            {/* ÁREA */}
            <section className="mt-7">

              <div className="flex items-center gap-2">

                <label
                  htmlFor="area"
                  className="text-sm font-semibold text-[#172033]"
                >
                  Área
                </label>

                <span className="rounded-full bg-[#F2F4F8] px-2 py-0.5 text-[11px] text-[#8A96A6]">
                  Opcional
                </span>

              </div>

              <p className="mt-1 text-xs text-[#8A96A6]">
                Nos ayuda a ubicar mejor los equipos observados.
              </p>

              <div className="relative mt-3">

                <select
                  id="area"
                  value={selectedArea}
                  onChange={(event) =>
                    setSelectedArea(event.target.value)
                  }
                  className="h-14 w-full appearance-none rounded-2xl border border-[#E2E7EE] bg-white px-4 pr-12 text-sm text-[#415065] outline-none transition focus:border-[#0B5ED7] focus:ring-4 focus:ring-[#EAF2FF]"
                >
                  <option value="">
                    Seleccionar área
                  </option>

                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={19}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA5B4]"
                />

              </div>

            </section>

            {/* RESUMEN SELECCIÓN */}
            {selectedHospital && (
              <section className="mt-6 rounded-2xl border border-[#E4E6FA] bg-[#F8F8FF] p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#4B1F91]">
                    <Check size={18} />
                  </div>

                  <div className="min-w-0">

                    <p className="text-xs font-medium text-[#7E75A8]">
                      Visita preparada
                    </p>

                    <p className="mt-0.5 truncate text-sm font-semibold text-[#172033]">
                      {selectedHospital.name}
                      {selectedArea ? ` · ${selectedArea}` : ''}
                    </p>

                  </div>

                </div>

              </section>
            )}

            {/* CONTINUAR */}
            <section className="mt-7">

              <button
                onClick={handleContinue}
                disabled={!selectedHospital}
                className={`group flex h-14 w-full items-center justify-center gap-3 rounded-2xl font-medium transition ${
                  selectedHospital
                    ? 'bg-gradient-to-r from-[#0B5ED7] via-[#3437B8] to-[#4B1F91] text-white shadow-lg shadow-[#3437B8]/20 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]'
                    : 'cursor-not-allowed bg-[#EEF1F5] text-[#A1ABB8]'
                }`}
              >
                Continuar a captura

                <ChevronRight
                  size={20}
                  className={
                    selectedHospital
                      ? 'transition-transform group-hover:translate-x-1'
                      : ''
                  }
                />

              </button>

              <p className="mt-3 text-center text-xs leading-5 text-[#9AA5B4]">
                En el siguiente paso podrás describir lo que observas.
              </p>

            </section>

          </div>

        </div>

      </div>
    </main>
  )
}

export default NewVisitPage