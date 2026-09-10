import { useEffect, useState } from 'react'
import { storageRequest } from '../data/storageApi'

type Status={sqlite:string;qvac:string;ai:{status:string;model?:string};stt:{status:string};ocr:{status:string}}
export default function LocalStatus() {
  const [status,setStatus]=useState<Status | null>(null),[error,setError]=useState(''),[network,setNetwork]=useState(navigator.onLine)
  useEffect(()=>{let active=true;const refresh=()=>{storageRequest<Status>('/status').then(s=>{if(active){setStatus(s);setError('')}}).catch(()=>{if(active){setStatus(null);setError('FastAPI no responde')}})};const online=()=>setNetwork(navigator.onLine);refresh();const timer=setInterval(refresh,20000);window.addEventListener('online',online);window.addEventListener('offline',online);return()=>{active=false;clearInterval(timer);window.removeEventListener('online',online);window.removeEventListener('offline',online)}},[])
  const ready=(value?:string)=>value==='ready'||value==='ok'?'Disponible':value==='busy'?'Ocupado':'No disponible'
  return <details className="mx-4 my-3 rounded-xl border border-slate-200 bg-white p-3 text-sm"><summary className="cursor-pointer font-medium text-blue-700">Modo local · {error || (status ? `MedPsy ${ready(status.ai.status)} · Voz ${ready(status.stt?.status)}` : 'Consultando servicios…')}</summary>
    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Internet (indicador del navegador)',network?'Conexión reportada':'Sin conexión'],['FastAPI',status?'Disponible':error?'No disponible':'Consultando'],['SQLite',ready(status?.sqlite)],['QVAC',ready(status?.qvac)],['MedPsy',ready(status?.ai.status)],['STT local',ready(status?.stt?.status)],['OCR local',ready(status?.ocr?.status)]].map(([name,value])=><div key={name}><dt className="text-slate-500">{name}</dt><dd>{value}</dd></div>)}</dl><p className="mt-3 text-xs text-slate-500">El indicador de red no comprueba los servicios locales ni garantiza acceso a Internet. Guardado en SQLite; no hay sincronización cloud.</p>
  </details>
}
