import { useEffect, useState } from 'react'
import { Building2, Map, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { storageRequest } from '../../data/storageApi'
import type { Hospital } from '../../data/hospitalOverview'

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))

export default function InstalledBaseMapPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    storageRequest<Hospital[]>('/hospitals').then(setHospitals)
      .catch(() => setError('No se pudo cargar el catálogo geográfico. Inicia el backend y reintenta.'))
  }, [])
  const officialHospitals = hospitals.filter(h => h.source_year === 2024)
  const provinces = unique(officialHospitals.map(h => h.province))
  const cities = unique(officialHospitals.filter(h => !province || h.province === province).map(h => h.city))
  const visible = officialHospitals.filter(h =>
    (!province || h.province === province) && (!city || h.city === city) &&
    `${h.name} ${h.city} ${h.province} ${h.dependency}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')),
  )
  const plotted = visible.filter(h => h.latitude != null && h.longitude != null)
  const lons = plotted.map(h => Number(h.longitude)); const lats = plotted.map(h => Number(h.latitude))
  const bounds = { minLon: Math.min(...lons, -83), maxLon: Math.max(...lons, -77), minLat: Math.min(...lats, 7), maxLat: Math.max(...lats, 10) }
  const point = (hospital: Hospital) => {
    const width = Math.max(0.5, bounds.maxLon - bounds.minLon); const height = Math.max(0.5, bounds.maxLat - bounds.minLat)
    const x = 70 + ((Number(hospital.longitude) - bounds.minLon) / width) * 860
    const y = 310 - ((Number(hospital.latitude) - bounds.minLat) / height) * 220
    return { x, y }
  }
  return <main className="mx-auto max-w-[1380px] px-4 py-8 pb-28 sm:px-6">
    <div className="flex items-start gap-3"><Map className="mt-1 text-blue-700" size={30} /><div>
      <h1 className="text-3xl font-semibold">Mapa de base instalada</h1>
      <p className="mt-2 text-sm text-slate-500">Panamá → provincia → ciudad → hospital → equipos registrados.</p>
    </div></div>
    {error && <p role="alert" className="storage-error mt-5">{error}</p>}
    <section className="panel mt-6 grid gap-3 md:grid-cols-4">
      <label className="text-sm font-medium">País<select value="Panamá" disabled className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-3"><option>Panamá</option></select></label>
      <label className="text-sm font-medium">Provincia<select value={province} onChange={e => { setProvince(e.target.value); setCity('') }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">Todas las provincias</option>{provinces.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium">Ciudad<select value={city} onChange={e => setCity(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">Todas las ciudades</option>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium">Buscar hospital<div className="relative mt-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3" placeholder="Nombre o dependencia" /></div></label>
    </section>
    <p role="status" className="mt-4 text-sm text-slate-600"><strong>{visible.length}</strong> hospitales en la selección · {unique(visible.map(h => h.province)).length} provincias</p>
    <section className="panel mt-4 overflow-hidden p-0">
      <div className="border-b bg-blue-50 px-5 py-3 text-sm text-blue-900">Ubicación por coordenadas del catálogo. Selecciona un punto para ver el hospital y abrir su historial.</div>
      <div className="overflow-x-auto bg-slate-50 p-4"><svg viewBox="0 0 1000 390" className="min-w-[700px]" role="img" aria-label="Mapa esquemático de hospitales de Panamá">
        <rect x="0" y="0" width="1000" height="390" rx="16" fill="#f8fafc" />
        <path d="M55 240 C150 178 214 207 292 224 C390 247 478 183 568 201 C645 217 703 167 778 183 C853 201 902 139 958 176 L939 241 C869 226 813 264 739 248 C650 229 591 282 505 257 C422 234 365 287 282 267 C189 245 117 291 63 278 Z" fill="#dbeafe" stroke="#93c5fd" strokeWidth="3" />
        <text x="70" y="55" fill="#475569" fontSize="16" fontWeight="600">Panamá</text>
        {plotted.map(h => { const p = point(h); const isSelected = selected === h.id; return <g key={h.id} onClick={() => setSelected(h.id)} className="cursor-pointer"><circle cx={p.x} cy={p.y} r={isSelected ? "13" : "9"} fill={isSelected ? "#f59e0b" : "#0759c9"} stroke="white" strokeWidth="4"><title>{h.name} · {h.province} · {h.city}</title></circle>{isSelected && <text x={p.x + 15} y={p.y + 5} fill="#172033" fontSize="13" fontWeight="600">{h.name}</text>}</g> })}
      </svg></div>
      {selected && <div className="border-t bg-white px-5 py-4 text-sm">{(() => { const hospital = plotted.find(h => h.id === selected)!; return <span><strong>{hospital.name}</strong> · {hospital.province} · {hospital.city} <Link className="ml-3 text-blue-700 underline" to={`/hospitals/${encodeURIComponent(hospital.id)}`}>Abrir Customer 360</Link></span> })()}</div>}
    </section>
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map(h => <article key={h.id} className="panel flex flex-col"><div className="flex gap-3"><Building2 className="shrink-0 text-blue-700" size={22}/><div><h2 className="font-semibold">{h.name}</h2><p className="mt-1 text-sm text-slate-500">{h.country} · {h.province} · {h.city}</p><p className="mt-1 text-xs text-slate-500">{h.facility_type} · {h.dependency}</p></div></div><div className="mt-4 flex gap-3 text-sm"><Link className="text-blue-700 underline" to={`/hospitals/${encodeURIComponent(h.id)}`}>Ver observaciones</Link><Link className="ml-auto inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-white" to={`/visits/new?hospital=${encodeURIComponent(h.id)}`}><Plus size={15}/> Observar</Link></div></article>)}
      {!visible.length && <p className="text-slate-500">No hay hospitales que coincidan con estos filtros.</p>}
    </section>
  </main>
}
