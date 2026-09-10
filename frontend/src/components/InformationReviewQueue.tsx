import { useEffect, useState } from 'react'
import { storageRequest } from '../data/storageApi'
import { readStored } from '../data/visitStore'

type Hospital = { id: string; name: string; city: string; country: string; verification_status: string }
type Evidence = { id: string; visit_id: string; observation_id: string; hospital_id: string; hospital_name: string; modality: string; manufacturer: string; original_text: string }
type Candidate = { id: string; hospital_id: string; modality: string; manufacturer: string; model: string }

export default function InformationReviewQueue({ onChange, hospitalId }: { onChange: () => void; hospitalId?: string }) {
  const [data, setData] = useState<{ hospitals: Hospital[]; evidence: Evidence[]; assets: Candidate[] } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    Promise.all([storageRequest<Hospital[]>('/hospitals'), storageRequest<Evidence[]>('/review/evidence'), storageRequest<Candidate[]>('/installed-equipment')])
      .then(([hospitals, evidence, assets]) => { if (active) setData({ hospitals, evidence, assets }) })
      .catch(cause => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [attempt])
  const save = async (path: string, body: object) => {
    setSaving(true); setError('')
    try {
      const actor = readStored<{ id: string | number }>('demo-user', { id: '' })
      await storageRequest(path, { method: 'PUT', body: JSON.stringify({ ...body, actorId: String(actor.id) }) })
      setAttempt(n => n + 1); onChange()
    } catch (cause) { setError((cause as Error).message) } finally { setSaving(false) }
  }
  return <section className="my-6 space-y-4">
    <h2 className="text-xl font-semibold">Hospitales y evidencias pendientes</h2>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {data?.hospitals.filter(h => (!hospitalId || h.id === hospitalId) && h.verification_status !== 'Confirmed').map(h => <article key={h.id} className="panel">
      <h3 className="font-semibold">{h.name}</h3><p>{h.city} · {h.country} · {h.verification_status}</p>
      <p className="text-sm text-slate-500">Motivo: hospital sin confirmar.</p>
      <div className="mt-3 flex gap-4">{['Confirmed', 'Needs verification'].map((status, i) => <button disabled={saving} key={status} className="text-blue-700" onClick={() => save(`/hospitals/${h.id}/decision`, { status })}>{i ? 'Mantener en verificación' : 'Confirmar hospital'}</button>)}</div>
    </article>)}
    {data?.evidence.filter(e => !hospitalId || e.hospital_id === hospitalId).map(e => <article key={`${e.visit_id}/${e.observation_id}/${e.id}`} className="panel">
      <h3 className="font-semibold">{e.hospital_name} · {e.modality} · {e.manufacturer || 'Marca no informada'}</h3>
      <p className="my-2 whitespace-pre-wrap text-sm">{e.original_text}</p><p className="text-sm text-amber-800">Motivo: evidencia sin activo consolidado.</p>
      <form className="mt-3 flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); const assetId = String(new FormData(event.currentTarget).get('asset') || ''); void save('/review/evidence', { visitId: e.visit_id, observationId: e.observation_id, equipmentId: e.id, assetId: assetId || null }) }}>
        <select name="asset" aria-label="Decisión de coincidencia" className="max-w-full rounded-xl border p-2"><option value="">Crear equipo nuevo</option>{data.assets.filter(a => a.hospital_id === e.hospital_id).map(a => <option key={a.id} value={a.id}>{a.modality} · {a.manufacturer} · {a.model} · {a.id.slice(0, 8)}</option>)}</select>
        <button disabled={saving} className="text-blue-700">Confirmar decisión</button>
      </form>
    </article>)}
    {data && !data.evidence.length && <p className="text-sm text-slate-500">No hay evidencias sin vincular.</p>}
  </section>
}
