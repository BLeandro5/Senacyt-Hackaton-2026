import { useState } from 'react'
import { storageRequest } from '../data/storageApi'

export default function PhotoOcr({dataUrl,onConfirm}:{dataUrl:string;onConfirm:(text:string)=>void}) {
  const [text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const read=async()=>{setBusy(true);setError('');try {const result=await storageRequest<{text:string}>('/media/ocr',{method:'POST',body:JSON.stringify({dataUrl}),signal:AbortSignal.timeout(50000)});setText(result.text)}catch(c){setError(c instanceof Error?c.message:'No se pudo leer la etiqueta.')}finally{setBusy(false)}}
  return <section className="my-4 rounded-2xl border border-blue-100 p-4"><p className="text-sm font-semibold">Lectura local de etiqueta / placa</p><p className="my-2 text-xs text-slate-500">Requiere Tesseract instalado. Sin OCR disponible, la fotografía permanece como adjunto; no se inventan datos.</p><button type="button" disabled={busy} className="text-blue-700 underline" onClick={read}>{busy?'Leyendo localmente…':'Leer texto de la fotografía'}</button>{error && <p role="alert" className="mt-2 text-sm text-amber-800">{error}</p>}
    {text && <><label className="mt-3 block text-sm">Dato extraído de fotografía — requiere confirmación<textarea className="mt-2 w-full rounded-xl border p-3" rows={4} value={text} onChange={e=>setText(e.target.value)}/></label><button type="button" className="mt-3 text-blue-700" onClick={()=>{onConfirm(text);setText('')}}>Confirmar y añadir a la nota editable</button></>}
  </section>
}
