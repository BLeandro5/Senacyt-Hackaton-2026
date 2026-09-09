import { readStored, writeStored, type Capture, type CurrentVisit } from '../../data/visitStore'
import VisitContext from '../../components/VisitContext'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, ChevronRight, FileText, Keyboard, Mic, MicOff, Send, Sparkles, X } from 'lucide-react'

type CaptureMode = 'chat' | 'voice'

function CapturePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [draft] = useState(() => readStored<Partial<Capture>>('capture-draft', readStored<Partial<Capture>>('current-observation', {})))
  const [mode, setMode] = useState<CaptureMode>(draft.captureMode || 'chat')
  const [observation, setObservation] = useState(draft.observation || '')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [photoName, setPhotoName] = useState(draft.photoName || '')
  const [photoData, setPhotoData] = useState(draft.photoData || '')
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visit = readStored<CurrentVisit>('current-visit', { hospitalName: '' })
  useEffect(() => {
    try { writeStored('capture-draft', { ...draft, observation, captureMode: mode, photoName, photoData }) }
    catch { /* The submit action reports storage failures without losing the editable text. */ }
  }, [draft, observation, mode, photoName, photoData])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  /*
    Por ahora estas sugerencias son simuladas.
    Después esta función puede reemplazarse por el modelo local.
  */
  const suggestions = useMemo(() => {
    const text = observation.toLowerCase()

    if (!text.trim()) {
      return [
        'Tomógrafo',
        'Resonador',
        'Ultrasonido',
        'Rayos X',
      ]
    }

    if (text.includes('tomógrafo')) {
      return [
        'Siemens',
        'Somatom',
        '64 cortes',
        'Operativo',
      ]
    }

    if (text.includes('resonador')) {
      return [
        'Philips',
        'Ingenia',
        '1.5T',
        'Operativo',
      ]
    }

    if (text.includes('ultrasonido')) {
      return [
        'GE',
        'LOGIQ',
        'Portátil',
        'En uso',
      ]
    }

    return [
      'Marca',
      'Modelo',
      'Edad aproximada',
      'Estado',
    ]
  }, [observation])

  const addSuggestion = (suggestion: string) => {
    setObservation((current) => {
      const clean = current.trim()

      if (!clean) {
        return suggestion
      }

      return `${clean} ${suggestion}`
    })
  }

  const toggleVoice = () => {
    if (!isListening) {
      setIsListening(true)
      return
    }

    /*
      DEMO:
      Al detener la grabación agregamos una transcripción simulada.

      Después aquí conectaremos el modelo de voz local.
    */
    setIsListening(false)

    const demoTranscript =
      'Veo un tomógrafo Siemens Somatom de 64 cortes, aproximadamente ocho años y actualmente operativo.'

    setObservation((current) =>
      current.trim()
        ? `${current.trim()} ${demoTranscript}`
        : demoTranscript
    )
  }

  const handlePhoto = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) { setError('Selecciona una imagen.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('La foto debe pesar menos de 2 MB para guardarla en este dispositivo.'); return }
    const reader = new FileReader()
    reader.onload = () => { setPhotoName(file.name); setPhotoData(String(reader.result)); setError('') }
    reader.onerror = () => setError('No pudimos leer la imagen. Intenta con otra.')
    reader.readAsDataURL(file)
  }

  const handleAnalyze = () => {
    if (!observation.trim() || isProcessing || isListening) return

    const capture = {
      ...visit,
      id: draft.id || crypto.randomUUID(),
      visitId: visit.id,
      photoData,
      observation: observation.trim(),
      photoName: photoName || null,
      captureMode: mode,
      capturedAt: new Date().toISOString(),
    }

    try {
      writeStored('current-observation', capture)
      writeStored('capture-draft', capture)
      localStorage.removeItem('current-structured-record')
      localStorage.removeItem('review-draft')
      localStorage.removeItem('match-result')
      localStorage.removeItem('match-draft')
    } catch { setError('No se pudo guardar la observación. Prueba quitando la foto o libera espacio y reintenta.'); return }

    setIsProcessing(true)

    timer.current = setTimeout(() => {
      navigate('/visits/new/review')
    }, 1200)
  }

  return (
    <main className="flow-page flow-capture">

      <div className="flow-container">

        {/* HEADER */}


        {/* CONTENIDO */}
        <div className="flow-layout">
          <VisitContext />

          <div className="flow-content">
            <button className="back-action" onClick={() => {
              try { writeStored('capture-draft', { ...draft, observation, captureMode: mode, photoName, photoData }); navigate('/home') }
              catch { setError('No se pudo guardar el borrador. Mantén esta pantalla abierta e intenta de nuevo.') }
            }}>← Guardar borrador y volver al inicio</button>

            {/* CONTEXTO */}
            <section className="pt-4">

              <div className="flex items-center justify-between">

                <div className="inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-3 py-1.5 text-xs font-medium text-[#3437B8]">
                  <Sparkles size={13} />
                  Captura
                </div>

                <span className="text-xs text-[#9AA5B4]">
                  Capturar observación
                </span>

              </div>

              <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#EEF1F5]">
                <div className="h-full w-full rounded-full ai-gradient" />
              </div>

              <div className="mt-7">

                <p className="text-sm font-medium text-[#0B5ED7]">
                  {visit.hospitalName}
                </p>

                {visit.area && (
                  <p className="mt-1 text-sm text-[#8A96A6]">
                    {visit.area}
                  </p>
                )}

              </div>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#172033] sm:text-4xl">
                ¿Qué estás observando?
              </h1>

              <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#6F7A8A]">
                Describe uno o varios equipos de forma natural. Puedes escribir o
                hablar; ambas opciones generan la misma observación.
              </p>

            </section>

            {/* SELECTOR CHAT / VOZ */}
            <section className="mt-8">

              <div className="grid grid-cols-2 rounded-2xl bg-[#F1F3F7] p-1.5">

                <button
                  aria-pressed={mode === 'chat'}
                  onClick={() => { setMode('chat'); setIsListening(false) }}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${
                    mode === 'chat'
                      ? 'bg-white text-[#0B5ED7] shadow-sm'
                      : 'text-[#7D8998] hover:text-[#172033]'
                  }`}
                >
                  <Keyboard size={18} />
                  Chat
                </button>

                <button
                  aria-pressed={mode === 'voice'}
                  onClick={() => setMode('voice')}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${
                    mode === 'voice'
                      ? 'bg-white text-[#4B1F91] shadow-sm'
                      : 'text-[#7D8998] hover:text-[#172033]'
                  }`}
                >
                  <Mic size={18} />
                  Voz
                </button>

              </div>

            </section>

            {/* ÁREA DE CAPTURA */}
            <section className="mt-5">

              <div className="overflow-hidden rounded-[22px] border border-[#E3E8EF] bg-white">

                {/* CHAT */}
                {mode === 'chat' && (
                  <div className="p-5 sm:p-6">

                    {/* Mensaje del asistente */}
                    <div className="flex items-start gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#4B1F91]">
                        <Sparkles size={17} />
                      </div>

                      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-[#F6F7FB] px-4 py-3">

                        <p className="text-sm leading-6 text-[#566276]">
                          Cuéntame qué equipo ves. Si conoces la marca,
                          modelo, antigüedad o estado, inclúyelos.
                        </p>

                      </div>

                    </div>

                    {/* Campo */}
                    <div className="mt-5">

                      <textarea
                        aria-label="Texto de la observación"
                        value={observation}
                        onChange={(event) =>
                          setObservation(event.target.value)
                        }
                        placeholder="Ej. Veo un tomógrafo Siemens Somatom..."
                        rows={5}
                        className="w-full resize-none rounded-2xl border border-[#E3E8EF] bg-[#FBFCFD] p-4 text-[15px] leading-6 text-[#172033] outline-none transition placeholder:text-[#A1ABB8] focus:border-[#3437B8] focus:bg-white focus:ring-4 focus:ring-[#EEF0FF]"
                      />

                    </div>

                    {/* AUTOCOMPLETADO */}
                    <div className="mt-4">

                      <div className="flex items-center gap-2">

                        <Sparkles
                          size={14}
                          className="text-[#4B1F91]"
                        />

                        <p className="text-xs font-medium text-[#756E9D]">
                          Autocompletar
                        </p>

                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">

                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() =>
                              addSuggestion(suggestion)
                            }
                            className="rounded-full border border-[#E3E0F4] bg-[#F8F7FF] px-3 py-2 text-xs font-medium text-[#57508A] transition hover:border-[#CFC9ED] hover:bg-[#F0EEFF]"
                          >
                            + {suggestion}
                          </button>
                        ))}

                      </div>

                    </div>

                  </div>
                )}

                {/* VOZ */}
                {mode === 'voice' && (
                  <div className="px-5 py-8 text-center sm:px-8 sm:py-10">

                    <div
                      className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full transition duration-300 ${
                        isListening
                          ? 'scale-105 bg-[#4B1F91] text-white shadow-xl shadow-[#4B1F91]/25'
                          : 'bg-gradient-to-br from-[#0B5ED7] to-[#4B1F91] text-white shadow-lg shadow-[#3437B8]/20'
                      }`}
                    >
                      {isListening ? (
                        <MicOff size={34} />
                      ) : (
                        <Mic size={34} />
                      )}
                    </div>

                    <h2 className="mt-6 text-lg font-semibold text-[#172033]">
                      {isListening
                        ? 'Escuchando...'
                        : 'Describe lo que estás viendo'}
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8A96A6]">
                      {isListening
                        ? 'Habla con naturalidad. Puedes detener la captura cuando termines.'
                        : 'La voz se convertirá en texto y podrás revisarla antes de analizar.'}
                    </p>

                    <p className="mt-3 text-xs text-amber-700" role="status">Voz demo: al detener se añade una transcripción de ejemplo. No se usa el micrófono.</p>
                    {/* Onda visual */}
                    {isListening && (
                      <div className="mt-6 flex h-8 items-center justify-center gap-1">

                        {[16, 26, 34, 22, 30, 18, 28].map(
                          (height, index) => (
                            <span
                              key={index}
                              className="w-1.5 rounded-full bg-gradient-to-t from-[#0B5ED7] to-[#4B1F91] animate-pulse"
                              style={{
                                height: `${height}px`,
                                animationDelay: `${index * 90}ms`,
                              }}
                            />
                          )
                        )}

                      </div>
                    )}

                    <button
                      onClick={toggleVoice}
                      className={`mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-medium transition ${
                        isListening
                          ? 'bg-[#F3ECFF] text-[#4B1F91] hover:bg-[#ECE3FC]'
                          : 'bg-[#172033] text-white hover:bg-[#232D42]'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff size={18} />
                          Detener
                        </>
                      ) : (
                        <>
                          <Mic size={18} />
                          Comenzar a hablar
                        </>
                      )}
                    </button>

                    {/* Transcripción */}
                    {observation && (
                      <div className="mt-8 border-t border-[#E9EDF2] pt-6 text-left">

                        <div className="flex items-center gap-2">
                          <FileText
                            size={16}
                            className="text-[#3437B8]"
                          />

                          <p className="text-xs font-medium text-[#7D8998]">
                            Transcripción
                          </p>
                        </div>

                        <textarea aria-label="Transcripción editable" className="mt-3 w-full rounded-xl border border-slate-200 p-4 text-sm" rows={5} value={observation} onChange={e => setObservation(e.target.value)} />

                      </div>
                    )}

                  </div>
                )}

              </div>

            </section>

            {error && <p role="alert" className="storage-error">{error}</p>}
            {photoData && <img src={photoData} alt="Fotografía adjunta" className="mt-5 max-h-48 rounded-xl" />}
            {/* FOTO OPCIONAL */}
            <section className="mt-5">

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhoto}
                className="hidden"
              />

              {!photoName ? (
                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-[#E5EAF0] bg-white px-4 py-4 text-left transition hover:bg-[#F8F9FC]"
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#0B5ED7]">
                      <Camera size={19} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-[#172033]">
                        Agregar fotografía
                      </p>

                      <p className="mt-0.5 text-xs text-[#8A96A6]">
                        Opcional · equipo, etiqueta o placa
                      </p>
                    </div>

                  </div>

                  <ChevronRight
                    size={18}
                    className="text-[#B1BAC6]"
                  />

                </button>
              ) : (
                <div className="flex items-center justify-between rounded-2xl border border-[#DDEBE6] bg-[#F5FAF8] px-4 py-4">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F7F1] text-[#159B72]">
                      <Check size={18} />
                    </div>

                    <div className="min-w-0">

                      <p className="text-sm font-medium text-[#172033]">
                        Fotografía agregada
                      </p>

                      <p className="mt-0.5 truncate text-xs text-[#8A96A6]">
                        {photoName}
                      </p>

                    </div>

                  </div>

                  <button
                    aria-label="Quitar fotografía"
                    onClick={() => { setPhotoName(''); setPhotoData(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#8A96A6] hover:bg-white"
                  >
                    <X size={17} />
                  </button>

                </div>
              )}

            </section>

            {/* ANALIZAR */}
            <section className="mt-7">

              <button
                onClick={handleAnalyze}
                disabled={!observation.trim() || isProcessing || isListening}
                className={`group flex h-14 w-full items-center justify-center gap-3 rounded-2xl font-medium transition ${
                  observation.trim() && !isProcessing
                    ? 'ai-gradient text-white shadow-lg shadow-[#3437B8]/20 hover:-translate-y-0.5 hover:shadow-xl'
                    : 'cursor-not-allowed bg-[#EEF1F5] text-[#A1ABB8]'
                }`}
              >

                {isProcessing ? (
                  <>
                    <Sparkles
                      size={19}
                      className="animate-pulse"
                    />
                    Procesando observación demo...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Analizar observación

                    <ChevronRight
                      size={19}
                      className={
                        observation.trim()
                          ? 'transition-transform group-hover:translate-x-1'
                          : ''
                      }
                    />
                  </>
                )}

              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#9AA5B4]">
                <Sparkles
                  size={13}
                  className="text-[#756EAD]"
                />
                Análisis demo · sin envío al servidor
              </div>

            </section>

          </div>

        </div>

      </div>

    </main>
  )
}

export default CapturePage
