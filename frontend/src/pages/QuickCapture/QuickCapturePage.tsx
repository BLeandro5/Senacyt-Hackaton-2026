import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageRequest } from '../../data/storageApi'
import { toEquipmentDrafts, type AnalysisResult } from '../../data/observationApi'
import { readStored, writeStored, discardVisitForHospital, type CurrentVisit } from '../../data/visitStore'
import type { CurrentUser } from '../../data/userApi'
import { resolveHospital } from '../../data/hospitalResolution'
import LocalVoiceCapture from '../../components/LocalVoiceCapture'

type Hospital = { id: string; name: string; city: string; country?: string; region: string }
export default function QuickCapturePage() {
  const navigate = useNavigate()
  const [text, setText] = useState(() => readStored<string>('quick-capture-note', ''))
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [hospitalId, setHospitalId] = useState('')
  const [proposal, setProposal] = useState({ name: '', city: '', country: '' })
  const [area, setArea] = useState('')
  const [busy, setBusy] = useState(false)
  const [voiceBusy,setVoiceBusy]=useState(false)
  const [error, setError] = useState('')
  useEffect(() => { try { writeStored('quick-capture-note', text) } catch { /* Text remains editable when storage is full. */ } }, [text])
  useEffect(() => { storageRequest<Hospital[]>('/hospitals').then(setHospitals).catch(c => setError(c.message)) }, [])
  const analyze = async () => {
    setBusy(true); setError('')
    try {
      const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
      const response = await fetch(`${base}/observations/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(190000) })
      const data = await response.json()
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'No se pudo analizar la nota.')
      setAnalysis(data)
      const matches = resolveHospital(hospitals, data.facility, text)
      setHospitalId(matches.length === 1 ? matches[0].id : '')
      setProposal({ name: data.facility || '', city: data.city || '', country: data.country || '' })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Comprueba los servicios locales.') }
    finally { setBusy(false) }
  }
  const proceed = () => {
    try {
      const hospital = hospitals.find(h => h.id === hospitalId)
      const user = readStored<CurrentUser | null>('demo-user', null)
      if (!hospital || !analysis || !user) return
      discardVisitForHospital(hospitalId)
      if (readStored<CurrentVisit | null>('current-visit', null)) throw new Error('Ya tienes una visita en este hospital. Continúala desde Nueva visita.')
      const visit = { id: crypto.randomUUID(), hospitalId, hospitalName: hospital.name, region: hospital.region, area, collaboratorId: user.id, startedAt: new Date().toISOString(), observations: [] }
      writeStored('current-observation', { ...visit, id: crypto.randomUUID(), visitId: visit.id, observation: text, analysis, captureMode: 'chat', capturedAt: new Date().toISOString() })
      writeStored('review-draft', toEquipmentDrafts(analysis))
      writeStored('current-visit', visit)
      for (const key of ['current-structured-record', 'match-result', 'match-draft', 'capture-draft', 'quick-capture-note']) localStorage.removeItem(key)
      navigate('/visits/new/review')
    } catch (cause) { setError((cause as Error).message) }
  }
  const propose = async () => {
    setBusy(true)
    try { const hospital = await storageRequest<Hospital>('/hospitals', { method: 'POST', body: JSON.stringify(proposal) }); setHospitals(v => [...v, hospital]); setHospitalId(hospital.id) }
    catch (cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-2xl p-4 sm:p-8"><h1 className="text-3xl font-semibold">Captura rápida</h1><p className="mt-3 text-slate-500">Describe el hospital y los equipos. MedPsy propondrá los datos para tu revisión.</p>
    {!analysis && <LocalVoiceCapture disabled={busy} onBusy={setVoiceBusy} onTranscript={value=>setText(current=>current ? current+'\n'+value : value)} />}
    <textarea aria-label="Nota original" className="my-5 min-h-40 w-full rounded-2xl border border-slate-200 p-4" value={text} disabled={busy || voiceBusy || !!analysis} onChange={e => setText(e.target.value)} />
    {!analysis && <button disabled={busy || voiceBusy || text.trim().length < 3} className="rounded-xl bg-blue-700 p-3 text-white disabled:opacity-50" onClick={analyze}>{busy ? 'Analizando con MedPsy…' : 'Analizar'}</button>}
    {analysis && <section className="panel"><h2 className="text-xl font-semibold">¿En qué hospital realizaste esta observación?</h2><p className="my-3 text-sm">Confirma el hospital antes de continuar. Idioma detectado: {analysis.detected_language || 'other'}.</p>
      <select aria-label="Hospital" className="w-full rounded-xl border p-3" value={hospitalId} onChange={e => setHospitalId(e.target.value)}><option value="">Selecciona hospital</option>{hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
      <label className="mt-3 block">Área<input className="mt-2 block w-full rounded-xl border p-3" value={area} onChange={e => setArea(e.target.value)} /></label>
      <details className="my-5"><summary>Proponer nuevo hospital</summary>{(['name','city','country'] as const).map((key, index) => <label className="mt-3 block" key={key}>{['Nombre','Ciudad','País'][index]}<input className="block w-full rounded-xl border p-3" value={proposal[key]} onChange={e => setProposal(v => ({ ...v, [key]: e.target.value }))}/></label>)}<button disabled={busy || Object.values(proposal).some(v => !v.trim())} onClick={propose} className="mt-3 text-blue-700">Guardar propuesta sin verificar</button></details>
      <button className="rounded-xl bg-blue-700 p-3 text-white disabled:opacity-50" disabled={!hospitalId || busy} onClick={proceed}>Confirmar hospital y revisar equipos</button><button type="button" className="ml-3 text-blue-700" onClick={() => setAnalysis(null)}>Editar nota</button></section>}
    {error && <p role="alert" className="storage-error mt-4">{error}</p>}
  </main>
}
