import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUiLanguage } from '../../data/uiLanguage'
import { analyticsCopy } from '../../data/analyticsCopy'
import { storageRequest } from '../../data/storageApi'

type Asset = { id: string; hospital_id: string; modality: string; manufacturer?: string | null; model?: string | null; estimated_age?: string | null; potentialOpportunity: boolean; reliability: { freshness: string } }

export default function OpportunitiesPage() {
  const { language } = useUiLanguage()
  const t = analyticsCopy[language]
  const [assets, setAssets] = useState<Asset[]>([])
  const [error, setError] = useState('')
  useEffect(() => { storageRequest<Asset[]>('/installed-equipment').then(rows => setAssets(rows.filter(row => row.potentialOpportunity))).catch(cause => setError(cause.message)) }, [])
  return <main data-ui-localized="true" className="mx-auto max-w-6xl p-4 sm:p-8"><p className="text-sm font-semibold text-blue-700">{t.signals}</p><h1 className="mt-1 text-3xl font-semibold">{t.opportunities}</h1><p className="mt-2 text-slate-500">{t.description}</p>
    {error && <p role="alert" className="storage-error mt-5">{t.loadError}</p>}
    <section className="mt-6 grid gap-4 md:grid-cols-2">{assets.map(asset => <article className="panel" key={asset.id}><h2 className="text-xl font-semibold">{asset.modality} · {asset.manufacturer || t.manufacturer}</h2><p className="mt-2">{t.ageLabel}: {asset.estimated_age || t.Unknown} · {t.freshness}: {t[asset.reliability.freshness as 'Fresh' | 'Aging' | 'Stale' | 'Unknown'] || t.Unknown}</p><p className="mt-2 text-sm text-slate-500">{t.review}</p><Link className="mt-3 inline-block text-blue-700 underline" to={`/equipment/${asset.id}`}>{t.open}</Link></article>)}</section>
    {!error && !assets.length && <p className="panel mt-6">{t.empty}</p>}
  </main>
}
