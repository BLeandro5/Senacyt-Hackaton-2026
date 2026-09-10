import { useEffect, useState } from 'react'
import { storageRequest } from '../data/storageApi'

export default function AssetAudit({ assetId }: { assetId: string }) {
  const [events,setEvents]=useState<{ changed_at: string; action: string; collaborator: string }[]>([])
  const [error,setError]=useState('')
  useEffect(() => { let active=true; storageRequest<typeof events>(`/installed-equipment/${assetId}/audit`).then(rows=>{if(active)setEvents(rows)}).catch(c=>{if(active)setError(c.message)}); return ()=>{active=false} },[assetId])
  return <details className="panel my-5"><summary>Auditoría de decisiones</summary>{error && <p role="alert">{error}</p>}{events.length ? <ul className="mt-3 space-y-2 text-sm">{events.map((e,i)=><li key={i}>{new Date(e.changed_at).toLocaleString()} · {e.collaborator} · {e.action}</li>)}</ul> : <p className="mt-3 text-sm">Sin decisiones auditadas.</p>}</details>
}
