import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { storageRequest } from '../../data/storageApi'
import type { InventorySummary } from '../../data/inventorySummary'

export default function MapPage() {
  const [data,setData]=useState<InventorySummary | null>(null),[error,setError]=useState('')
  const [country,setCountry]=useState(''),[region,setRegion]=useState(''),[city,setCity]=useState('')
  useEffect(()=>{let active=true;storageRequest<{intelligence:InventorySummary}>('/dashboard').then(d=>{if(active)setData(d.intelligence)}).catch(c=>{if(active)setError(c.message)});return()=>{active=false}},[])
  const label=(value:string)=>value || 'No informado'
  const all=data?.hospitals.filter(h=>h.visits>0) || []
  const countries=[...new Set(all.map(h=>label(h.country)))].sort()
  const regional=all.filter(h=>!country || label(h.country)===country)
  const regions=[...new Set(regional.map(h=>label(h.region)))].sort()
  const municipal=regional.filter(h=>!region || label(h.region)===region)
  const cities=[...new Set(municipal.map(h=>label(h.city)))].sort()
  const selected=municipal.filter(h=>!city || label(h.city)===city)
  const sum=(key:'assets'|'stale'|'opportunities'|'conflicts')=>selected.reduce((n,h)=>n+h[key],0)
  const modality=(key:string)=>selected.reduce((n,h)=>n+(h.modalities[key] || 0),0)
  return <main className="mx-auto max-w-[1380px] p-4 py-8 sm:p-8"><h1 className="text-3xl font-semibold">Mapa de actividad y geografía</h1>
    <p className="my-3 text-sm text-slate-500">Exploración local país → región/provincia → ciudad → hospital. El esquema no representa coordenadas ni distancias; no se inventan ubicaciones de hospitales.</p>
    {error && <p role="alert" className="storage-error">{error}</p>}
    {!data && !error && <p role="status">Consultando geografía guardada…</p>}
    {data && <><section className="panel my-5"><h2 className="font-semibold">Países con observaciones · esquema interactivo offline</h2>
      <svg viewBox={`0 0 900 ${Math.max(130,Math.ceil(countries.length/4)*115)}`} role="group" aria-label="Esquema de actividad por país" className="mt-4 w-full">{countries.map((name,index)=>{const x=15+(index%4)*225,y=10+Math.floor(index/4)*115;const hospitals=all.filter(h=>label(h.country)===name);return <g key={name} role="button" tabIndex={0} aria-label={`Filtrar ${name}`} onClick={()=>{setCountry(name);setRegion('');setCity('')}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setCountry(name);setRegion('');setCity('')}}} className="cursor-pointer"><rect x={x} y={y} width={205} height={95} rx={18} fill={country===name?'#0B5ED7':'#EAF2FF'}/><text x={x+12} y={y+32} fontSize={14} fill={country===name?'white':'#172033'}>{name.slice(0,24)}</text><text x={x+12} y={y+57} fontSize={12} fill={country===name?'white':'#475569'}>{hospitals.length} hospitales</text><text x={x+12} y={y+78} fontSize={12} fill={country===name?'white':'#475569'}>{hospitals.reduce((n,h)=>n+h.assets,0)} activos canónicos</text></g>})}</svg>
      {!countries.length && <p className="mt-3 text-sm">Finaliza una visita para ver actividad geográfica.</p>}
    </section><div className="grid gap-3 sm:grid-cols-3">{[{name:'País',value:country,options:countries,change:(v:string)=>{setCountry(v);setRegion('');setCity('')}},{name:'Región / provincia',value:region,options:regions,change:(v:string)=>{setRegion(v);setCity('')}},{name:'Ciudad',value:city,options:cities,change:setCity}].map(filter=><label key={filter.name} className="text-sm">{filter.name}<select className="mt-2 block w-full rounded-xl border p-3" value={filter.value} onChange={e=>filter.change(e.target.value)}><option value="">Todas</option>{filter.options.map(v=><option key={v}>{v}</option>)}</select></label>)}</div>
    <section className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Hospitales observados',selected.length],['Activos',sum('assets')],['MRI',modality('MRI')],['CT',modality('CT')],['Ultrasound',modality('Ultrasound')],['Stale',sum('stale')],['>7 años',sum('opportunities')],['Conflictos',sum('conflicts')]].map(([name,count])=><div className="panel" key={name}><strong className="text-2xl">{count}</strong><p className="text-sm">{name}</p></div>)}</section>
    <section className="grid gap-3 sm:grid-cols-2">{selected.map(h=><Link key={h.id} to={`/hospitals/${h.id}`} className="panel"><h2 className="font-semibold text-blue-700">{h.name}</h2><p className="mt-2 text-sm">{label(h.country)} · {label(h.region)} · {label(h.city)}</p><p className="mt-2 text-sm">{h.assets} activos · {h.evidence} evidencias · Abrir Customer 360 →</p></Link>)}</section></>}
  </main>
}
