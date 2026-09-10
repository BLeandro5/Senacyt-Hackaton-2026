import { useEffect, useRef, useState } from 'react'
import { storageRequest } from '../data/storageApi'

export default function PhotoOcr({dataUrl,onConfirm}:{dataUrl:string;onConfirm:(text:string)=>void}) {
  const [text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const [layout,setLayout]=useState('sparse')
  const request=useRef<AbortController | null>(null)
  useEffect(()=>()=>request.current?.abort(),[])
  const read=async()=>{
    request.current?.abort()
    const controller=new AbortController(); request.current=controller
    setBusy(true);setError('');setText('')
    try {
      const result=await storageRequest<{text:string;truncated?:boolean}>('/media/ocr',{method:'POST',body:JSON.stringify({dataUrl,layout}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(50000)])})
      if(!controller.signal.aborted){setText(result.text);if(result.truncated)setError('Texto truncado a 8000 caracteres. Fotografía solo la placa.')}
    }catch(c){if(!controller.signal.aborted)setError(c instanceof Error?c.message:'No se pudo leer la etiqueta.')}
    finally{if(!controller.signal.aborted)setBusy(false)}
  }
  return <section className="my-4 rounded-2xl border border-blue-100 p-4">
    <p className="text-sm font-semibold">Lectura local de etiqueta / placa</p>
    <p className="my-2 text-sm text-slate-500">Fotografía la placa de cerca, derecha, enfocada y sin reflejos. Se lee el texto visible; no se deduce la antigüedad ni el estado operativo por la apariencia.</p>
    <label className="my-3 block text-sm">Distribución del texto<select disabled={busy} value={layout} onChange={e=>{setLayout(e.target.value);setText('')}} className="mt-2 block w-full rounded-xl border p-3">
      <option value="sparse">Placa con campos separados</option><option value="block">Bloque de texto</option><option value="line">Una sola línea o código</option>
    </select></label>
    <button type="button" disabled={busy} className="text-blue-700 underline" onClick={read}>{busy?'Leyendo localmente…':'Leer texto de la fotografía'}</button>
    {error && <p role="alert" className="mt-2 text-sm text-amber-800">{error}</p>}
    {text && <><label className="mt-3 block text-sm">Revisa marca, modelo y números antes de confirmar<textarea className="mt-2 w-full rounded-xl border p-3" rows={6} value={text} onChange={e=>setText(e.target.value)}/></label><button type="button" disabled={busy || !text.trim()} className="mt-3 text-blue-700" onClick={()=>{onConfirm(text.trim());setText('')}}>Confirmar y añadir a la nota editable</button></>}
  </section>
}
