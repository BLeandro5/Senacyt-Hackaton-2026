import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storageRequest } from '../data/storageApi'
import { displayDate, type Visit } from '../data/visitStore'
import { filterObservations, normalizeSearch, observationRows, type HospitalLocation } from '../data/observationExplorer'

export default function ObservationExplorer() {
  const [data, setData] = useState<{ visits: Visit[]; hospitals: HospitalLocation[] } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [country, setCountry] = useState('')
  const [hospitalId, setHospitalId] = useState('')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(6)
  useEffect(() => {
    let active = true
    Promise.all([storageRequest<Visit[]>('/visits'), storageRequest<HospitalLocation[]>('/hospitals')])
      .then(([visits, hospitals]) => { if (active) { setData({ visits, hospitals }); setError('') } })
      .catch(cause => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [attempt])
  const rows = useMemo(() => observationRows(data?.visits || [], data?.hospitals || []), [data])
  const countries = [...new Map(rows.map(row => [normalizeSearch(row.country), row.country])).values()].sort()
  const hospitals = [...new Map(rows.filter(row => !country || normalizeSearch(row.country) === normalizeSearch(country)).map(row => [row.hospitalId, row.hospital])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  const filtered = filterObservations(rows, { country, hospitalId, search })
  const grouped = [...new Map(filtered.map(row => [row.hospitalId, { name: row.hospital, country: row.country, city: row.city }])).entries()]
  return <section id="observaciones-generales" className="my-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold">Observaciones generales</h2><p className="mt-2 text-sm text-slate-500">Consulta las observaciones de todos los colaboradores por país y hospital.</p></div>
      <button type="button" className="rounded-xl border border-blue-200 px-4 py-2 text-blue-700" onClick={() => setAttempt(n => n + 1)}>Actualizar observaciones</button></div>
    {error && <p role="alert" className="storage-error mt-4">{error}{data ? ' Se conserva la última consulta; puede estar desactualizada.' : ''}</p>}
    {!data && !error && <p role="status" className="mt-4">Cargando observaciones de SQLite…</p>}
    {data && <>
      <div className="my-5 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">País<select className="mt-2 block w-full rounded-xl border border-slate-200 p-3" value={country} onChange={e => { setCountry(e.target.value); setHospitalId(''); setLimit(6) }}><option value="">Todos los países</option>{countries.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="text-sm">Hospital<select className="mt-2 block w-full rounded-xl border border-slate-200 p-3" value={hospitalId} onChange={e => { setHospitalId(e.target.value); setLimit(6) }}><option value="">Todos los hospitales</option>{hospitals.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="text-sm">Buscar<input type="search" className="mt-2 block w-full rounded-xl border border-slate-200 p-3" placeholder="Equipo, marca, nota o colaborador" value={search} onChange={e => { setSearch(e.target.value); setLimit(6) }} /></label>
      </div>
      <p className="text-sm text-slate-600">{filtered.length} observaciones · {new Set(filtered.map(r => r.visit.id)).size} visitas · {grouped.length} hospitales · {filtered.reduce((n,r) => n + r.observation.equipment.length, 0)} registros de equipos</p>
      <p className="mt-1 text-xs text-slate-500">Los registros de equipos son evidencia observada; no equivalen a activos físicos únicos.</p>
      {(country || hospitalId || search) && <button className="mt-3 text-sm text-blue-700 underline" onClick={() => { setCountry(''); setHospitalId(''); setSearch(''); setLimit(6) }}>Limpiar filtros</button>}
      <div className="my-5 flex flex-wrap gap-2">{grouped.map(([id,h]) => <button key={id} className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-left text-sm text-blue-800" onClick={() => { setHospitalId(id); setLimit(6) }}><span className="block font-semibold">{h.name}</span><span>{h.country} · {filtered.filter(r => r.hospitalId === id).length} observaciones</span></button>)}</div>
      {!filtered.length && <p className="rounded-xl bg-slate-50 p-4 text-slate-600">{rows.length ? 'No hay observaciones que coincidan con los filtros.' : 'Todavía no hay observaciones de visitas finalizadas. Registra y finaliza una visita para verla aquí.'}</p>}
      <div className="grid gap-4 lg:grid-cols-2">{filtered.slice(0,limit).map(row => <article key={row.key} className="rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-blue-700">{row.country}{row.city ? ` · ${row.city}` : ''}</p><h3 className="mt-1 font-semibold">{row.hospital}</h3>
        <p className="mt-2 text-xs text-slate-500">{row.visit.collaborator?.name || 'Colaborador histórico'} · {displayDate(row.observation.capturedAt || row.visit.completedAt)}{row.visit.area ? ` · ${row.visit.area}` : ''}</p>
        <p className="my-3 whitespace-pre-wrap break-words text-sm">{row.observation.originalText}</p>
        <details className="text-sm"><summary className="cursor-pointer text-blue-700">Ver {row.observation.equipment.length} registros de equipos</summary><ul className="mt-2 space-y-2">{row.observation.equipment.map(e => <li key={e.id}>{e.type} · {e.brand || 'Marca no informada'} · {e.model || 'Modelo no informado'} · {e.estimatedAge || 'Edad no informada'}</li>)}</ul></details>
        <Link className="mt-3 inline-block text-sm font-medium text-blue-700 underline" to={`/visits/${encodeURIComponent(row.visit.id)}`}>Ver visita completa</Link>
      </article>)}</div>
      {filtered.length > limit && <button className="mt-4 rounded-xl border px-4 py-2 text-blue-700" onClick={() => setLimit(n => n + 6)}>Mostrar más observaciones</button>}
    </>}
  </section>
}
