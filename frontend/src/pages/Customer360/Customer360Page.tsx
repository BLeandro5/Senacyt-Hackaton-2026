import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { storageRequest } from '../../data/storageApi'
import type { HospitalOverview } from '../../data/hospitalOverview'

type Landscape = { modality: string; quantity: number; approxAge: string; confidence: { score: number; level: string }; lastUpdated: string | null }
type Customer360 = HospitalOverview & { assets: unknown[]; landscape: Landscape[]; summary: HospitalOverview['summary'] & { canonicalEquipment: number } }

const date = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString() : 'Unknown'

export default function Customer360Page() {
  const { hospitalId } = useParams()
  const [data, setData] = useState<Customer360 | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hospitalId) return
    let active = true
    storageRequest<Customer360>(`/hospitals/${encodeURIComponent(hospitalId)}/overview`)
      .then(value => { if (active) setData(value) })
      .catch(cause => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [hospitalId])

  if (error) return <main className="mx-auto max-w-6xl p-5 sm:p-8"><p role="alert" className="storage-error">{error}</p></main>
  if (!data) return <main className="mx-auto max-w-6xl p-5 sm:p-8"><p role="status">Cargando perfil del hospital…</p></main>
  const { hospital, summary } = data
  return <main className="mx-auto max-w-6xl p-5 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-semibold text-blue-700">Customer 360 · SQLite local</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{hospital.name}</h1>
        <p className="mt-2 text-slate-600">{[hospital.city, hospital.province, hospital.country].filter(Boolean).join(' · ')}</p>
      </div>
      <Link className="rounded-xl bg-blue-700 px-4 py-3 text-white" to={`/visits/new?hospital=${encodeURIComponent(hospital.id)}`}>Nueva observación</Link>
    </header>

    <section className="my-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[[summary.canonicalEquipment, 'Equipos canónicos'], [summary.visits, 'Visitas finalizadas'], [summary.observations, 'Observaciones'], [date(summary.lastVisit), 'Última actualización']].map(([value, label]) =>
        <article className="panel" key={String(label)}><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></article>)}
    </section>

    <section className="panel overflow-x-auto">
      <h2 className="text-xl font-semibold">Panorama de equipos conocido</h2>
      <p className="mt-1 text-sm text-slate-500">Solo incluye activos canónicos que una persona decidió conservar en la base instalada.</p>
      {data.landscape.length ? <table className="mt-4 w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Tipo de equipo</th><th className="p-3">Cantidad</th><th className="p-3">Antigüedad aprox.</th><th className="p-3">Confiabilidad</th><th className="p-3">Actualizado</th></tr></thead>
        <tbody>{data.landscape.map(row => <tr className="border-b border-slate-100" key={row.modality}><td className="p-3 font-medium">{row.modality}</td><td className="p-3">{row.quantity}</td><td className="p-3">{row.approxAge}</td><td className="p-3">{row.confidence.level} ({row.confidence.score}/100)</td><td className="p-3">{date(row.lastUpdated)}</td></tr>)}</tbody></table>
        : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Aún no hay equipos canónicos. Revisa una observación y decide si cada equipo es nuevo o coincide con uno existente.</p>}
    </section>

    <section className="panel mt-6">
      <h2 className="text-xl font-semibold">Observaciones del hospital</h2>
      <p className="mt-1 text-sm text-slate-500">{summary.equipmentRecords} evidencias registradas. Abre cada una para ver el texto y los equipos reportados.</p>
      <div className="mt-4 space-y-3">{data.equipment.map(record => <details className="rounded-xl border border-slate-200 p-4" key={`${record.visitId}/${record.observationId}/${record.id}`}><summary className="cursor-pointer font-medium">{record.type} · {record.brand || 'Marca desconocida'} · {date(record.recordedAt)}</summary><p className="mt-3 text-sm text-slate-600">Área: {record.area || 'No informada'} · Visita: <Link className="text-blue-700 underline" to={`/visits/${encodeURIComponent(record.visitId)}`}>{record.visitId}</Link></p><p className="mt-3 whitespace-pre-wrap text-sm">{record.originalText}</p><p className="mt-3 text-sm">Modelo: {record.model || 'Unknown'} · Antigüedad: {record.estimatedAge || 'Unknown'} · Estado: {record.status || 'Unknown'}</p></details>)}</div>
      {!data.equipment.length && <p className="mt-4 text-sm text-slate-500">Todavía no hay observaciones finalizadas para este hospital.</p>}
    </section>
  </main>
}
