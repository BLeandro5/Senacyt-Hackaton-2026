import { useEffect, useRef, useState } from 'react'
import { pcmWav } from '../data/pcmAudio'

export default function LocalVoiceCapture({ onTranscript, onBusy, disabled=false }: { onTranscript: (text:string)=>void; onBusy?: (busy:boolean)=>void; disabled?: boolean }) {
  const [recording,setRecording]=useState(false), [processing,setProcessing]=useState(false), [error,setError]=useState('')
  const [starting,setStarting]=useState(false)
  const recorder=useRef<MediaRecorder | null>(null), stream=useRef<MediaStream | null>(null), timer=useRef<ReturnType<typeof setTimeout> | null>(null), active=useRef(true), controller=useRef<AbortController | null>(null)
  useEffect(()=>{active.current=true;return()=>{active.current=false;controller.current?.abort();if(timer.current)clearTimeout(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop())}},[])
  const start=async()=>{
    setError('');setStarting(true);onBusy?.(true)
    try {
      if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==='undefined')throw new Error('Este navegador no permite capturar audio local. Usa la entrada escrita.')
      const media=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=media
      if(!active.current){media.getTracks().forEach(t=>t.stop());return}
      const rec=new MediaRecorder(media);recorder.current=rec;const chunks:Blob[]=[]
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}
      rec.onstop=async()=>{
        media.getTracks().forEach(t=>t.stop());if(timer.current)clearTimeout(timer.current)
        if(!active.current)return
        setRecording(false);setProcessing(true)
        let context:AudioContext | null=null
        try {
          context=new AudioContext();const decoded=await context.decodeAudioData(await new Blob(chunks,{type:rec.mimeType}).arrayBuffer());chunks.length=0
          const wav=pcmWav(Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i)),decoded.sampleRate)
          controller.current=new AbortController()
          const base=(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/,'')
          const response=await fetch(`${base}/media/transcribe`,{method:'POST',headers:{'Content-Type':'audio/wav'},body:wav,signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(120000)])})
          const body=await response.json();if(!response.ok)throw new Error(body.detail || 'No se pudo transcribir.')
          if(active.current)onTranscript(body.text)
        } catch(cause){if(active.current)setError(cause instanceof Error ? cause.message : 'Audio vacío o incompatible.')} finally {await context?.close();if(active.current){setProcessing(false);onBusy?.(false)}}
      }
      rec.start();setRecording(true);timer.current=setTimeout(()=>{if(rec.state==='recording')rec.stop()},175000)
    } catch(cause){stream.current?.getTracks().forEach(t=>t.stop());onBusy?.(false);setError(cause instanceof DOMException && cause.name==='NotAllowedError' ? 'Permiso de micrófono denegado. Puedes escribir la observación.' : cause instanceof Error ? cause.message : 'No se pudo iniciar el micrófono.')}
    finally { if(active.current)setStarting(false) }
  }
  return <section className="rounded-2xl border border-blue-100 p-4 text-left"><p className="font-medium">Transcripción local — el audio no sale del dispositivo.</p><p className="my-2 text-xs text-slate-500">Español · máximo 3 minutos · revisa el texto antes de analizarlo con MedPsy.</p>
    <button type="button" disabled={disabled || processing || starting} className="rounded-xl bg-blue-700 px-4 py-3 text-white disabled:opacity-50" onClick={()=>{if(recording)recorder.current?.stop();else void start()}}>{recording?'Detener y transcribir':processing?'Transcribiendo localmente…':starting?'Solicitando micrófono…':'Comenzar a hablar'}</button>
    {recording && <p role="status" className="mt-2 text-sm">Micrófono activo…</p>}{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>
}
