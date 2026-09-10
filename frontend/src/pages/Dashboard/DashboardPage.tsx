import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { storageRequest } from '../../data/storageApi'

type Totals = { label: string; visits: number; observations: number; hospitals: number; equipmentRecords: number }
type Group = Totals & { id?: string; region?: string }
type Dashboard = { summary: Totals; byHospital: Group[]; byRegion: Group[]; byProvince: Group[]; byModality: Group[] }

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [metric, setMetric] = useState<'equipmentRecords' | 'visits'>('equipmentRecords')
  useEffect(() => {
    let active = true
    storageRequest<Dashboard>('/dashboard').then(result => { if (active) { setData(result); setError('') } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el dashboard.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const refresh = () => { setLoading(true); setAttempt(n => n + 1) }
  return <main className="mx-auto max-w-[1380px] px-4 py-8 pb-28 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-semibold">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Resumen de las visitas finalizadas y guardadas.</p></div>
      <button disabled={loading} onClick={refresh} className="rounded-xl bg-blue-700 px-5 py-3 text-white disabled:opacity-50">{loading ? 'Cargando...' : 'Actualizar'}</button>
    </header>
    {error && <p role="alert" className="storage-error mt-5">{error}</p>}
    {loading && <p role="status" className="mt-4">Consultando registros guardados...</p>}
    {data && !error && <>
      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([['Hospitales con visitas', data.summary.hospitals], ['Visitas', data.summary.visits], ['Observaciones', data.summary.observations], ['Registros de equipos', data.summary.equipmentRecords]] as const).map(([label, value]) =>
          <div className="panel" key={label}><p className="text-3xl font-semibold text-blue-800">{value}</p><p className="mt-2 text-sm text-slate-500">{label}</p></div>)}
      </section>
      <p className="my-5 text-sm text-slate-500">Se cuentan registros de equipos, no equipos físicos únicos. Un equipo observado en varias visitas puede aparecer varias veces.</p>
      {!data.summary.visits ? <section className="panel"><h2 className="text-xl font-semibold">Aún no hay visitas finalizadas</h2><p className="my-3">Finaliza una visita para incluirla en estos totales.</p><Link className="text-blue-700 underline" to="/visits/new">Nueva visita</Link></section> : <>
        <label className="mb-5 block text-sm">Comparar por
          <select value={metric} onChange={e => setMetric(e.target.value as typeof metric)} className="ml-3 rounded-xl border border-slate-200 bg-white p-3">
            <option value="equipmentRecords">Registros de equipos</option><option value="visits">Visitas</option>
          </select>
        </label>
        <div className="grid gap-5 lg:grid-cols-2">
          <Chart title="Por hospital" groups={data.byHospital} metric={metric} />
          <Chart title="Por provincia" groups={data.byProvince} metric={metric} />
          <Chart title="Por región" groups={data.byRegion} metric={metric} />
          <Chart title="Por modalidad" groups={data.byModality} metric={metric} />
        </div>
        <section className="panel mt-5"><h2 className="text-xl font-semibold">Totales por hospital</h2><div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm"><thead><tr>{['Hospital', 'Región', 'Visitas', 'Observaciones', 'Registros de equipos'].map(h => <th className="p-3" scope="col" key={h}>{h}</th>)}</tr></thead>
            <tbody>{data.byHospital.map(h => <tr key={h.id} className="border-t border-slate-100"><td className="p-3"><Link className="text-blue-700 underline" to={`/hospitals/${encodeURIComponent(h.id!)}`}>{h.label}</Link></td><td className="p-3">{h.region || 'No indicada'}</td><td className="p-3">{h.visits}</td><td className="p-3">{h.observations}</td><td className="p-3">{h.equipmentRecords}</td></tr>)}</tbody>
          </table></div></section>
        <p className="mt-4 text-xs text-slate-500">Una visita con varias modalidades cuenta en cada modalidad correspondiente; esos subtotales de visitas no se suman.</p>
      </>}
    </>}
  </main>
}

function Chart({ title, groups, metric }: { title: string; groups: Group[]; metric: 'visits' | 'equipmentRecords' }) {
  const maximum = Math.max(1, ...groups.map(g => g[metric]))
  return <section className="panel"><h2 className="text-xl font-semibold">{title}</h2><ul className="mt-5 space-y-4">
    {groups.map(g => <li key={g.id || g.label}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{g.label}</span><strong>{g[metric]}</strong></div>
      <div aria-hidden="true" className="h-3 rounded-full bg-blue-50"><div className="h-full rounded-full bg-blue-600" style={{ width: `${g[metric] / maximum * 100}%` }} /></div>
    </li>)}
  </ul></section>
}
