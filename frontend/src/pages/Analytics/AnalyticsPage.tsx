import { useState } from 'react'
import { useUiLanguage } from '../../data/uiLanguage'
import { analyticsCopy } from '../../data/analyticsCopy'
import { storageRequest } from '../../data/storageApi'

type Result = { filters: Record<string, unknown>; equipment: { id: string; hospital_id: string; modality: string; manufacturer?: string | null; estimated_age?: string | null }[] }

export default function AnalyticsPage() {
  const { language } = useUiLanguage()
  const t = analyticsCopy[language]
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function ask() {
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
      <input id="analytics-question" className="mt-2 w-full rounded-xl border p-3" required minLength={3} value={question} onChange={event => setQuestion(event.target.value)} placeholder={t.placeholder} />
      <button className="mt-4 rounded-xl bg-blue-700 px-4 py-3 text-white" disabled={loading}>{loading ? t.loading : t.analyze}</button>
    </form>
    {error && <p role="alert" className="storage-error mt-5">{t.error}</p>}
    {result && <section className="panel mt-5"><h2 className="text-xl font-semibold">{t.results}</h2><p className="mt-2 text-sm text-slate-500">{t.filters}: {JSON.stringify(result.filters)}</p>
      <p className="mt-4 font-medium">{result.equipment.length} {t.matches}</p><ul className="mt-3 grid gap-3 sm:grid-cols-2">{result.equipment.map(asset => <li className="rounded-xl border p-4" key={asset.id}>{asset.modality} · {asset.manufacturer || t.manufacturer}<p className="mt-1 text-sm text-slate-500">{asset.hospital_id} · {asset.estimated_age || t.age}</p></li>)}</ul></section>}
  </main>
}
