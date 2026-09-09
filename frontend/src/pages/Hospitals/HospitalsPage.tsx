import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Building2, Search } from 'lucide-react'
import { storageRequest } from '../../data/storageApi'
import { displayDate } from '../../data/visitStore'
import { filterHospitalEquipment, type Hospital, type HospitalOverview } from '../../data/hospitalOverview'

export default function HospitalsPage() {
  const { hospitalId } = useParams()
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [overview, setOverview] = useState<HospitalOverview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  const [type, setType] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([
      storageRequest<Hospital[]>('/hospitals'),
      hospitalId ? storageRequest<HospitalOverview>(`/hospitals/${encodeURIComponent(hospitalId)}/overview`) : Promise.resolve(null),
    ]).then(([catalog, data]) => {
      if (active) { setHospitals(catalog); setOverview(data); setError('') }
    }).catch(() => {
      if (active) { setOverview(null); setError('No se pudo cargar el hospital. Comprueba que exista y que el backend esté iniciado.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [hospitalId, attempt])

  const current = overview?.hospital.id === hospitalId ? overview : null
  const equipment = current?.equipment || []
  const filtered = filterHospitalEquipment(equipment, query, area, type)
  const areas = [...new Set(equipment.map(e => e.area).filter(Boolean))].sort()
  const types = [...new Set(equipment.map(e => e.type))].sort()
  const selectHospital = (id: string) => {
    setLoading(true); setQuery(''); setArea(''); setType(''); setError('')
    navigate(id ? `/hospitals/${encodeURIComponent(id)}` : '/hospitals')
  }

  return <main className="mx-auto max-w-[1380px] px-4 py-8 pb-28 sm:px-6">
    <div className="mb-6 flex items-center gap-3">
      <Building2 className="text-blue-700" size={30} />
      <div><h1 className="text-3xl font-semibold">Vista por hospital</h1>
        <p className="mt-2 text-sm text-slate-500">Consulta las visitas finalizadas y los equipos registrados de cada cliente.</p></div>
    </div>
    <label className="block max-w-xl text-sm font-medium">Hospital
      <select value={hospitalId || ''} onChange={e => selectHospital(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3">
        <option value="">Selecciona un hospital</option>
        {hospitals.map(h => <option key={h.id} value={h.id}>{h.name} · {h.region}</option>)}
      </select>
    </label>
    {loading && <p role="status" className="mt-5">Cargando datos del hospital...</p>}
    {error && <div role="alert" className="storage-error mt-5">{error}
      <button className="ml-3 underline" onClick={() => { setLoading(true); setAttempt(n => n + 1) }}>Reintentar</button>
    </div>}
    {!hospitalId && !loading && !error && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hospitals.map(h => <Link key={h.id} to={`/hospitals/${encodeURIComponent(h.id)}`} className="panel block hover:border-blue-400">
        <h2 className="font-semibold text-blue-800">{h.name}</h2><p className="mt-2 text-sm text-slate-500">{h.city} · {h.region}</p>
      </Link>)}
      {hospitals.length === 0 && <p>No hay hospitales registrados.</p>}
    </div>}
    {current && !error && <>
      <section className="panel mt-6">
        <h2 className="text-xl font-semibold">{current.hospital.name}</h2>
        <p className="mt-1 text-sm text-slate-500">{current.hospital.city} · {current.hospital.region}</p>
        <p className="mt-2 text-sm">Última visita: {current.summary.lastVisit ? displayDate(current.summary.lastVisit) : 'Sin visitas finalizadas'}</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[['Visitas', current.summary.visits], ['Observaciones', current.summary.observations], ['Registros de equipos', current.summary.equipmentRecords]].map(([label, count]) =>
            <div key={label} className="rounded-xl bg-blue-50 p-3"><p className="text-2xl font-semibold text-blue-800">{count}</p><p className="text-xs text-slate-600">{label}</p></div>)}
        </div>
        <p className="mt-4 text-sm text-slate-500">Un equipo puede aparecer en varias visitas. Estos totales cuentan registros, no equipos físicos únicos.</p>
      </section>
      <section className="panel mt-5">
        <h2 className="text-xl font-semibold">Equipos registrados</h2>
        <div className="my-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm"><span className="flex items-center gap-1"><Search size={14} />Buscar</span>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Marca, modelo o estado" className="mt-1 w-full rounded-xl border border-slate-200 p-3" /></label>
          <label className="text-sm">Área<select value={area} onChange={e => setArea(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3">
            <option value="">Todas las áreas</option>{areas.map(a => <option key={a}>{a}</option>)}
          </select></label>
          <label className="text-sm">Tipo<select value={type} onChange={e => setType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3">
            <option value="">Todos los tipos</option>{types.map(t => <option key={t}>{t}</option>)}
          </select></label>
        </div>
        <p role="status" className="mb-3 text-sm text-slate-500">{filtered.length} de {equipment.length} registros</p>
        {filtered.length === 0 ? <p className="py-8 text-center text-slate-500">{equipment.length ? 'No hay resultados para estos filtros.' : 'Finaliza una visita para ver aquí sus equipos.'}</p> :
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500">{['Equipo', 'Área', 'Antigüedad', 'Estado', 'Origen'].map(h => <th key={h} scope="col" className="p-3">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(e => <tr key={`${e.visitId}/${e.observationId}/${e.id}`} className="border-b border-slate-100">
              <td className="p-3"><p className="font-semibold">{e.type}</p><p>{e.brand || 'Marca no indicada'} · {e.model || 'Modelo no indicado'}</p>
                <details className="mt-1 text-slate-500"><summary className="cursor-pointer">Observación original</summary><p className="mt-2 max-w-sm whitespace-pre-wrap">{e.originalText}</p></details></td>
              <td className="p-3">{e.area || 'No indicada'}</td><td className="p-3">{e.estimatedAge || 'No indicada'}</td><td className="p-3">{e.status || 'No indicado'}</td>
              <td className="p-3"><Link to={`/visits/${encodeURIComponent(e.visitId)}`} className="text-blue-700 underline">{displayDate(e.recordedAt)}</Link></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
      <section className="panel mt-5"><h2 className="text-xl font-semibold">Historial del hospital</h2>
        <div className="mt-3 divide-y divide-slate-100">{current.visits.map(v => <Link key={v.id} to={`/visits/${encodeURIComponent(v.id)}`} className="flex justify-between gap-3 py-3 text-sm text-blue-700">
          <span>{displayDate(v.completedAt)} · {v.area || 'Área no indicada'}</span><span>{v.observationCount} observaciones →</span>
        </Link>)}</div>
        {!current.visits.length && <p className="mt-3 text-sm text-slate-500">Aún no hay visitas finalizadas.</p>}
      </section>
    </>}
  </main>
}
