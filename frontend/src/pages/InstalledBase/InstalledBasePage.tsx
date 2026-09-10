import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { storageRequest } from '../../data/storageApi'
import { readStored } from '../../data/visitStore'
import SupervisorQueue from '../../components/SupervisorQueue'
import ObservationHistory from '../../components/ObservationHistory'

type Asset = {
  id: string; hospital_id: string; modality: string; manufacturer: string | null; model: string | null
  estimated_age: string | null; configuration: string | null; status: string
  hasConflict: boolean; evidenceCount: number; independentCollaborators: number; lastObservedAt: string; potentialOpportunity: boolean
  reliability: { score: number; level: string; freshness: string; breakdown: Record<string, number> }
  evidence: { id: string; visit_id: string; observation_id: string; original_text: string; captured_at: string; collaboratorName: string; evidenceStatus?: Record<string, string> }[]
}
type Hospital = { id: string; name: string; city: string; country: string; region: string; verification_status: string }

export default function InstalledBasePage() {
  const { hospitalId } = useParams()
  const { pathname } = useLocation()
  const review = pathname.endsWith('/review')
  const [data, setData] = useState<{ assets: Asset[]; hospitals: Hospital[] } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answer, setAnswer] = useState<{ filters: Record<string, unknown>; equipment: Asset[] } | null>(null)
  const [queryError, setQueryError] = useState('')
  const ask = async () => {
    setAsking(true)
    setQueryError('')
    setAnswer(null)
    try {
      setAnswer(await storageRequest('/analytics/query', { method: 'POST', body: JSON.stringify({ text: question }), signal: AbortSignal.timeout(190_000) }))
    } catch (cause) { setQueryError((cause as Error).message) } finally { setAsking(false) }
  }
  const decide = async (asset: Asset, action: string, evidence?: Asset['evidence'][number]) => {
    setSaving(true)
    try {
      const user = readStored<{ id: string }>('demo-user', { id: '' })
      await storageRequest(`/installed-equipment/${asset.id}/decision`, { method: 'PUT', body: JSON.stringify({ actorId: String(user.id), action, visitId: evidence?.visit_id, observationId: evidence?.observation_id, equipmentId: evidence?.id }) })
      setAttempt(v => v + 1)
    } catch (cause) { setError((cause as Error).message) } finally { setSaving(false) }
  }
  useEffect(() => {
    let active = true
    Promise.all([storageRequest<Asset[]>('/installed-equipment'), storageRequest<Hospital[]>('/hospitals')])
      .then(([assets, hospitals]) => { if (active) { setData({ assets, hospitals }); setError('') } })
      .catch(cause => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [attempt])
  const hospital = data?.hospitals.find(h => h.id === hospitalId)
  const visible = (answer?.equipment ?? data?.assets ?? []).filter(a => (!hospitalId || a.hospital_id === hospitalId)
    && (!review || a.hasConflict || a.reliability.level === 'Low' || a.reliability.freshness === 'Stale')
    && [a.modality, a.manufacturer, a.model].join(' ').toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(b.hasConflict) - Number(a.hasConflict))
  return <main className="mx-auto max-w-[1380px] p-4 sm:p-8">
    <div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-semibold text-blue-700">Base instalada · SQLite local</p>
      <Link className="text-sm text-blue-700 underline" to="/supervisor/settings">Configuración</Link>
      <h1 className="mt-2 text-3xl font-semibold">{hospital?.name || (review ? 'Por revisar' : 'Base instalada consolidada')}</h1>
      {hospital && <p className="mt-2 text-slate-500">{hospital.city} · {hospital.country} · {hospital.region} · {hospital.verification_status}</p>}</div>
      <button className="rounded-xl bg-blue-700 px-4 py-3 text-white" onClick={() => setAttempt(v => v + 1)}>Actualizar</button></div>
    {error && <p role="alert" className="storage-error mt-4">{error}</p>}
    {!data && !error && <p role="status">Consultando SQLite…</p>}
    {data && <>
      {review && <SupervisorQueue onChange={() => { setAnswer(null); setAttempt(v => v + 1) }} />}
      <form className="panel mt-5" onSubmit={e => { e.preventDefault(); void ask() }}>
        <label className="block text-sm" htmlFor="inventory-question">Consultar inventario con MedPsy local</label>
        <input id="inventory-question" minLength={3} maxLength={2000} required className="my-3 w-full rounded-xl border p-3" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Equipos CT Philips con más de 7 años" />
        <button disabled={asking} className="rounded-xl bg-blue-700 px-4 py-2 text-white">{asking ? 'Interpretando consulta…' : 'Consultar'}</button>
        {answer && <><button type="button" className="ml-3 text-blue-700" onClick={() => setAnswer(null)}>Limpiar consulta</button><p className="mt-3 text-sm">Filtros interpretados: {JSON.stringify(answer.filters)}. Los resultados provienen de SQLite; verifica los filtros antes de usarlos.</p></>}
        {queryError && <p role="alert" className="mt-3 text-red-700">{queryError}</p>}
      </form>
      <section className="my-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        ['Activos canónicos', visible.length], ['Evidencias', visible.reduce((n,a) => n + a.evidenceCount, 0)],
        ['Conflictos', visible.filter(a => a.hasConflict).length], ['Posibles renovaciones >7 años', visible.filter(a => a.potentialOpportunity).length],
      ].map(([label,value]) => <div className="panel" key={label}><p className="text-3xl font-semibold">{value}</p><p className="mt-2 text-sm text-slate-500">{label}</p></div>)}</section>
      {!hospitalId && <nav className="mb-6 flex flex-wrap gap-2" aria-label="Hospitales">{data.hospitals.map(h => <Link className="rounded-xl border border-blue-100 bg-white p-3 text-blue-700" key={h.id} to={`/supervisor/hospitals/${h.id}`}>{h.name}</Link>)}</nav>}
      <label className="block mb-5 text-sm">Buscar equipos<input className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3" value={query} onChange={e => setQuery(e.target.value)} /></label>
      {!visible.length && <p className="panel">No hay activos consolidados para esta vista. Las observaciones históricas sin decisión de equipo permanecen en el historial.</p>}
      <section className="grid gap-4 lg:grid-cols-2">{visible.map(a => <article key={a.id} className="panel">
        <h2 className="text-xl font-semibold">{a.modality} · {a.manufacturer || 'Marca no informada'}</h2>
        <p className="mt-1 text-sm text-slate-500">{a.model || 'Modelo no informado'} · {a.configuration || 'Configuración no informada'}</p>
        <p className="mt-3">Confiabilidad {a.reliability.score}/100 · {a.reliability.level}</p>
        <p className="mt-2 text-sm">Estado de revisión: {a.status}</p>
        {review && <div className="my-3 flex flex-wrap gap-3">{(['Confirmed','Reported','Needs verification'] as const).map((action, index) => <button disabled={saving} className="rounded-lg border border-blue-100 p-2 text-blue-700" key={action} onClick={() => decide(a, action)}>{['Confirmar','Mantener reportado','Requiere verificación'][index]}</button>)}</div>}
        <details className="mt-2 text-sm"><summary>Factores deterministas</summary><ul className="mt-2">{Object.entries(a.reliability.breakdown).map(([key,value]) => <li key={key}>{key}: {value}</li>)}</ul></details>
        <p className="mt-3 text-sm">{a.evidenceCount} evidencias · {a.independentCollaborators} colaboradores · {a.reliability.freshness}</p>
        <p className="mt-1 text-sm">Última observación: {a.lastObservedAt ? new Date(a.lastObservedAt).toLocaleDateString() : 'No informada'}</p>
        {a.hasConflict && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-800">Conflicto de información. Requiere verificación.</p>}
        {a.potentialOpportunity && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-blue-800">Posible oportunidad de renovación: {a.estimated_age}. Priorizar validación y seguimiento comercial.</p>}
        <details className="mt-4"><summary className="cursor-pointer text-blue-700">Historial de evidencias</summary>{a.evidence.map(e => <div className="mt-3 border-t border-slate-100 pt-3" key={`${e.visit_id}/${e.observation_id}/${e.id}`}><p className="text-sm font-semibold">Registrado por {e.collaboratorName || 'Colaborador histórico'}</p><p className="mt-2 whitespace-pre-wrap text-sm">{e.original_text}</p><dl className="mt-2 flex flex-wrap gap-2 text-xs">{Object.entries(e.evidenceStatus || {}).map(([field,status]) => <div className="rounded-lg border p-2" key={field}><dt>{field}</dt><dd>{status}</dd></div>)}</dl>{review && <div className="mt-3 flex gap-3"><button disabled={saving} className="text-blue-700" onClick={() => decide(a,'accept_evidence',e)}>Usar valores de esta evidencia</button><button disabled={saving} className="text-blue-700" onClick={() => decide(a,'separate',e)}>Separar como otro equipo</button></div>}</div>)}</details>
      </article>)}</section>
      {!review && <ObservationHistory key={`${hospitalId || 'all'}:${attempt}`} hospitalId={hospitalId} />}
    </>}
  </main>
}
