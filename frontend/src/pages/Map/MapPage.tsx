import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storageRequest } from '../../data/storageApi'
import type { InventorySummary } from '../../data/inventorySummary'

import HospitalMap from '../../components/HospitalMap'
import type { Hospital } from '../../data/hospitalOverview'

export default function MapPage() {
  const [data,setData]=useState<InventorySummary | null>(null),[error,setError]=useState('')
  const [country,setCountry]=useState(''),[region,setRegion]=useState(''),[city,setCity]=useState('')
  useEffect(()=>{let active=true;storageRequest<{intelligence:InventorySummary}>('/dashboard').then(d=>{if(active)setData(d.intelligence)}).catch(c=>{if(active)setError(c.message)});return()=>{active=false}},[])
  const [catalog, setCatalog] = useState<Hospital[]>([])
  useEffect(() => { let active = true; storageRequest<Hospital[]>('/hospitals').then(h => { if (active) setCatalog(h) }).catch(c => { if (active) setError(c.message) }); return () => { active = false } }, [])
  const label=(value:string)=>value || 'No informado'
  const all=data?.hospitals.filter(h=>h.visits>0) || []
  const countries=[...new Set(all.map(h=>label(h.country)))].sort()
  const regional=all.filter(h=>!country || label(h.country)===country)
  const regions=[...new Set(regional.map(h=>label(h.region)))].sort()
  const municipal=regional.filter(h=>!region || label(h.region)===region)
  const cities=[...new Set(municipal.map(h=>label(h.city)))].sort()
  const selected=municipal.filter(h=>!city || label(h.city)===city)
  const located = useMemo(() => {
    const ids = new Set((data?.hospitals || []).filter(h => h.visits > 0 &&
      (!country || (h.country || 'No informado') === country) &&
      (!region || (h.region || 'No informado') === region) &&
      (!city || (h.city || 'No informado') === city)).map(h => h.id))
    return catalog.filter(h => ids.has(h.id))
  }, [catalog, data, country, region, city])
  const sum=(key:'assets'|'stale'|'opportunities'|'conflicts')=>selected.reduce((n,h)=>n+h[key],0)
  const modality=(key:string)=>selected.reduce((n,h)=>n+(h.modalities[key] || 0),0)
  return <main className="mx-auto max-w-[1380px] p-4 py-8 sm:p-8"><h1 className="text-3xl font-semibold">Mapa de actividad y geografía</h1>
    <p className="my-3 text-sm text-slate-500">Exploración local país → región/provincia → ciudad → hospital. Selecciona un hospital en el mapa para abrir sus observaciones.</p>
    {error && <p role="alert" className="storage-error">{error}</p>}
    {!data && !error && <p role="status">Consultando geografía guardada…</p>}
    {data && <><section className="panel my-5"><h2 className="mb-4 font-semibold">Hospitales con observaciones</h2><HospitalMap hospitals={located} />
      {!countries.length && <p className="mt-3 text-sm">Finaliza una visita para ver actividad geográfica.</p>}
    </section><div className="grid gap-3 sm:grid-cols-3">{[{name:'País',value:country,options:countries,change:(v:string)=>{setCountry(v);setRegion('');setCity('')}},{name:'Región / provincia',value:region,options:regions,change:(v:string)=>{setRegion(v);setCity('')}},{name:'Ciudad',value:city,options:cities,change:setCity}].map(filter=><label key={filter.name} className="text-sm">{filter.name}<select className="mt-2 block w-full rounded-xl border p-3" value={filter.value} onChange={e=>filter.change(e.target.value)}><option value="">Todas</option>{filter.options.map(v=><option key={v}>{v}</option>)}</select></label>)}</div>
    <section className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Hospitales observados',selected.length],['Activos',sum('assets')],['MRI',modality('MRI')],['CT',modality('CT')],['Ultrasound',modality('Ultrasound')],['Stale',sum('stale')],['>7 años',sum('opportunities')],['Conflictos',sum('conflicts')]].map(([name,count])=><div className="panel" key={name}><strong className="text-2xl">{count}</strong><p className="text-sm">{name}</p></div>)}</section>
    <section className="grid gap-3 sm:grid-cols-2">{selected.map(h=><Link key={h.id} to={`/hospitals/${h.id}`} className="panel"><h2 className="font-semibold text-blue-700">{h.name}</h2><p className="mt-2 text-sm">{label(h.country)} · {label(h.region)} · {label(h.city)}</p><p className="mt-2 text-sm">{h.assets} activos · {h.evidence} evidencias · Abrir Customer 360 →</p></Link>)}</section></>}
  </main>
}
