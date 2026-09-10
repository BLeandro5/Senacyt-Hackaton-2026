import { useEffect, useState } from 'react'
import { storageRequest } from '../data/storageApi'
import type { Visit } from '../data/visitStore'

export default function ObservationHistory({ hospitalId }: { hospitalId?: string }) {
  const [visits, setVisits] = useState<Visit[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    storageRequest<Visit[]>(`/visits${hospitalId ? `?hospital_id=${encodeURIComponent(hospitalId)}` : ''}`)
      .then(rows => { if (active) setVisits(rows) }).catch(cause => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [hospitalId])
  return <section className="panel my-6"><h2 className="text-xl font-semibold">Historial de observaciones</h2>
    {error && <p role="alert">{error}</p>}
    <p className="my-3 text-sm text-slate-500">{visits.length} visitas · {visits.reduce((n, v) => n + v.observations.length, 0)} observaciones. Incluye evidencia histórica aún no consolidada.</p>
    {visits.map(v => <details key={v.id} className="border-t py-3"><summary>{v.hospital} · {v.collaborator?.name || 'Colaborador histórico'} · {new Date(v.completedAt).toLocaleDateString()}</summary>
      {v.observations.map(o => <div key={o.id} className="my-3 border-l-2 border-blue-200 pl-3"><p className="whitespace-pre-wrap">{o.originalText}</p><p className="mt-2 text-sm text-slate-500">{o.equipment.length} evidencias · {o.detectedLanguage || 'other'}</p><ul className="mt-2 text-sm">{o.equipment.map(e => <li key={e.id}>{e.type} · {e.brand || 'Marca no informada'} · {e.model || 'Modelo no informado'} · {e.estimatedAge || 'Edad no informada'}</li>)}</ul></div>)}
    </details>)}
  </section>
}
