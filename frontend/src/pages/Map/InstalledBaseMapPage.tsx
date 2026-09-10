import { useEffect, useMemo, useState } from 'react'
import { Building2, Map, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { storageRequest } from '../../data/storageApi'
import type { Hospital } from '../../data/hospitalOverview'

import HospitalMap from '../../components/HospitalMap'

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))

export default function InstalledBaseMapPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    storageRequest<Hospital[]>('/hospitals').then(setHospitals)
      .catch(() => setError('No se pudo cargar el catálogo geográfico. Inicia el backend y reintenta.'))
  }, [])
  const countries = unique(hospitals.map(h => h.country))
  const officialHospitals = hospitals.filter(h => !country || h.country === country)
  const provinces = unique(officialHospitals.map(h => h.province))
  const cities = unique(officialHospitals.filter(h => !province || h.province === province).map(h => h.city))
  const visible = officialHospitals.filter(h =>
    (!province || h.province === province) && (!city || h.city === city) &&
    `${h.name} ${h.city} ${h.province} ${h.dependency}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')),
  )
  const plotted = useMemo(() => hospitals.filter(h => (!country || h.country === country) && (!province || h.province === province) && (!city || h.city === city) && `${h.name} ${h.city} ${h.province} ${h.dependency}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))), [hospitals, country, province, city, query])
  return <main className="mx-auto max-w-[1380px] px-4 py-8 pb-28 sm:px-6">
    <div className="flex items-start gap-3"><Map className="mt-1 text-blue-700" size={30} /><div>
      <h1 className="text-3xl font-semibold">Mapa de base instalada</h1>
      <p className="mt-2 text-sm text-slate-500">País → provincia → ciudad → hospital → equipos registrados.</p>
    </div></div>
    {error && <p role="alert" className="storage-error mt-5">{error}</p>}
    <Link className="mt-4 inline-block text-blue-700 underline" to="/map/activity">Ver actividad y totales por geografía</Link>
    <section className="panel mt-6 grid gap-3 md:grid-cols-4">
      <label className="text-sm font-medium">País<select value={country} onChange={e => { setCountry(e.target.value); setProvince(''); setCity('') }} className="mt-1 w-full rounded-xl border p-3"><option value="">Todos los países</option>{countries.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium">Provincia<select value={province} onChange={e => { setProvince(e.target.value); setCity('') }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">Todas las provincias</option>{provinces.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium">Ciudad<select value={city} onChange={e => setCity(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="">Todas las ciudades</option>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium">Buscar hospital<div className="relative mt-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={17}/><input value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-3" placeholder="Nombre o dependencia" /></div></label>
    </section>
    <p role="status" className="mt-4 text-sm text-slate-600"><strong>{visible.length}</strong> hospitales en la selección · {unique(visible.map(h => h.province)).length} provincias</p>
    <section className="panel mt-4 overflow-hidden p-0">
      <HospitalMap hospitals={plotted} />
    </section>
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map(h => <article key={h.id} className="panel flex flex-col"><div className="flex gap-3"><Building2 className="shrink-0 text-blue-700" size={22}/><div><h2 className="font-semibold">{h.name}</h2><p className="mt-1 text-sm text-slate-500">{h.country} · {h.province} · {h.city}</p><p className="mt-1 text-xs text-slate-500">{h.facility_type} · {h.dependency}</p></div></div><div className="mt-4 flex gap-3 text-sm"><Link className="text-blue-700 underline" to={`/hospitals/${encodeURIComponent(h.id)}`}>Ver observaciones</Link><Link className="ml-auto inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-white" to={`/visits/new?hospital=${encodeURIComponent(h.id)}`}><Plus size={15}/> Observar</Link></div></article>)}
      {!visible.length && <p className="text-slate-500">No hay hospitales que coincidan con estos filtros.</p>}
    </section>
  </main>
}
