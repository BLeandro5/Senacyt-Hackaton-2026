import { useState } from 'react'
import { useUiLanguage } from '../../data/uiLanguage'
import { analyticsCopy } from '../../data/analyticsCopy'
import { storageRequest } from '../../data/storageApi'
import { Link } from 'react-router-dom'

type Result = { filters: Record<string, unknown>; equipment: { id: string; hospital_id: string; modality: string; manufacturer?: string | null; estimated_age?: string | null }[] }

export default function AnalyticsPage() {
  const { language } = useUiLanguage()
  const t = analyticsCopy[language]
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function ask() {
    if (loading || question.trim().length < 3) return
    setLoading(true); setError(''); setResult(null)
    try { setResult(await storageRequest<Result>('/analytics/query', { method: 'POST', body: JSON.stringify({ text: question }), signal: AbortSignal.timeout(190_000) })) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to analyze the query.') }
    finally { setLoading(false) }
  }
  return <main data-ui-localized="true" className="mx-auto max-w-6xl p-4 sm:p-8">
    <p className="text-sm font-semibold text-blue-700">MedPsy · SQLite local</p>
    <h1 className="mt-1 text-3xl font-semibold">{t.title}</h1>
    <p className="mt-2 text-slate-500">{t.subtitle}</p>
    <form className="panel mt-6" onSubmit={event => { event.preventDefault(); void ask() }}>
      <label className="block text-sm font-medium" htmlFor="analytics-question">{t.question}</label>
      <input id="analytics-question" className="mt-2 w-full rounded-xl border p-3" required minLength={3} maxLength={2000} value={question} onChange={event => setQuestion(event.target.value)} placeholder={t.placeholder} />
      <button className="mt-4 rounded-xl bg-blue-700 px-4 py-3 text-white" disabled={loading}>{loading ? t.loading : t.analyze}</button>
    </form>
    {error && <p role="alert" className="storage-error mt-5">{error}</p>}
    {result && <section className="panel mt-5"><h2 className="text-xl font-semibold">{t.results}</h2><h3 className="mt-3 text-sm font-medium">{t.filters}</h3>
      <dl className="mt-2 flex flex-wrap gap-2">{Object.entries(result.filters).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([key, value]) => <div key={key} className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800"><dt className="inline font-medium">{filterLabels[language][key] || key}: </dt><dd className="inline">{typeof value === 'boolean' ? (value ? '✓' : '✕') : String(value)}</dd></div>)}</dl>
      <p role="status" className="mt-4 font-medium">{result.equipment.length} {t.matches}</p><ul className="mt-3 grid gap-3 sm:grid-cols-2">{result.equipment.map(asset => <li className="min-w-0 rounded-xl border p-4" key={asset.id}><p className="font-medium">{asset.modality} · {asset.manufacturer || t.manufacturer}</p><p className="mt-1 text-sm text-slate-500">{asset.estimated_age || t.age}</p><Link className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 text-sm text-blue-700" to={`/equipment/${encodeURIComponent(asset.id)}`}>{t.open}</Link></li>)}</ul></section>}
  </main>
}

const filterLabels: Record<string, Record<string, string>> = {
  es: { country:'País', city:'Ciudad', hospital_id:'Hospital', modality:'Modalidad', manufacturer:'Marca', min_age:'Edad mayor que', max_age:'Edad máxima', manufacturer_unknown:'Marca desconocida', reliability_level:'Confiabilidad', freshness:'Actualización', has_conflict:'Conflictos' },
  en: { country:'Country', city:'City', hospital_id:'Hospital', modality:'Modality', manufacturer:'Manufacturer', min_age:'Age greater than', max_age:'Maximum age', manufacturer_unknown:'Unknown manufacturer', reliability_level:'Reliability', freshness:'Freshness', has_conflict:'Conflicts' },
  pt: { country:'País', city:'Cidade', hospital_id:'Hospital', modality:'Modalidade', manufacturer:'Fabricante', min_age:'Idade maior que', max_age:'Idade máxima', manufacturer_unknown:'Fabricante desconhecido', reliability_level:'Confiabilidade', freshness:'Atualidade', has_conflict:'Conflitos' },
}
