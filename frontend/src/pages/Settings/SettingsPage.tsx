import { useEffect, useState } from 'react'
import { storageRequest } from '../../data/storageApi'
import { applyAppearance } from '../../data/appearance'
import { useUiLanguage } from '../../data/uiLanguage'

const copy = {
  es: ['Configuración','Idioma','Apariencia','Claro','Oscuro','Sistema','Estado local','Internet no requerido','Esta herramienta es para inventario de equipos. No realiza diagnósticos ni recomendaciones clínicas. No introduzca datos identificables de pacientes.'],
  en: ['Settings','Language','Appearance','Light','Dark','System','Local status','Internet not required','This tool is for equipment inventory. It provides no diagnosis or clinical recommendations. Do not enter identifiable patient data.'],
  pt: ['Configurações','Idioma','Aparência','Claro','Escuro','Sistema','Estado local','Internet não necessário','Esta ferramenta é para inventário de equipamentos. Não faz diagnósticos nem recomendações clínicas. Não insira dados identificáveis de pacientes.'],
}
export default function SettingsPage() {
  const { language, changeLanguage } = useUiLanguage()
  const [theme, setTheme] = useState(() => localStorage.getItem('appearance') || 'system')
  const [status, setStatus] = useState<{ fastapi: string; sqlite: string; qvac: string; stt: { status: string }; ai: { status: string; model?: string; quantization?: string; model_mode?: string } } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { storageRequest<typeof status>('/status').then(setStatus).catch(c => setError(c.message)) }, [])
  const t = copy[language]
  return <main className="mx-auto max-w-2xl p-4 sm:p-8"><h1 className="text-3xl font-semibold">{t[0]}</h1><section className="panel mt-5 space-y-5">
    <label className="block">{t[1]}<select className="ml-3 rounded-xl border p-3" value={language} onChange={e => changeLanguage(e.target.value as keyof typeof copy)}><option value="es">Español</option><option value="en">English</option><option value="pt">Português</option></select></label>
    <label className="block">{t[2]}<select className="ml-3 rounded-xl border p-3" value={theme} onChange={e => { localStorage.setItem('appearance',e.target.value); setTheme(e.target.value); applyAppearance() }}>{['light','dark','system'].map((value,index) => <option key={value} value={value}>{t[index+3]}</option>)}</select></label>
    <h2 className="text-xl font-semibold">{t[6]}</h2>{status && <><dl className="grid gap-3 sm:grid-cols-2">{[['FastAPI',status.fastapi],['SQLite',status.sqlite],['QVAC SDK',status.qvac],[status.ai.model || 'MedPsy',status.ai.status],['Vosk / STT',status.stt?.status || 'unavailable']].map(([name,value]) => <div key={name} className="rounded-xl border border-slate-200 p-3"><dt className="font-medium">{name}</dt><dd className="mt-1 text-sm text-slate-500">{value}</dd></div>)}</dl><p className="text-sm">{status.ai.quantization || ''} · {status.ai.model_mode || 'base'}</p><p className="text-sm">{t[7]}</p></>}{error && <p role="alert">{error}</p>}
    <p className="text-sm text-slate-500">{t[8]}</p></section></main>
}
