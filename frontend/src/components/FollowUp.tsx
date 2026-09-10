import { useState } from 'react'
import { readStored, writeStored } from '../data/visitStore'
import type { EquipmentDraft } from '../data/observationApi'
import { nextFollowUp, followUpAnswer } from '../data/followUp'

export default function FollowUp({ observationId, equipment, update }: {
  observationId: string; equipment: EquipmentDraft[]; update: (id: string, field: keyof EquipmentDraft, value: string) => void
}) {
  const key = `follow-up:${observationId}`
  const [answered, setAnswered] = useState<string[]>(() => readStored(key, []))
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const question = nextFollowUp(equipment, answered)
  if (answered.length >= 2 || !question) return null
  const respond = (unknown: boolean) => {
    const next = [...answered, question.id]
    try {
      const response = unknown ? { field: question.field, value: '' } : followUpAnswer(question.field, answer)
      writeStored(key, next)
      update(question.item.id, response.field, response.value)
      setAnswered(next); setAnswer('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la respuesta.') }
  }
  return <section className="panel mt-5"><p className="font-semibold">Pregunta {answered.length + 1} de 2 · Equipo {question.index + 1}: {question.item.type}</p>
    <label className="mt-3 block">¿Conoces la {question.label} de este equipo?<input value={answer} onChange={e => setAnswer(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3" /></label>
    <p className="mt-2 text-xs text-slate-500">La respuesta se aplica solamente a este equipo. Puedes corregir los demás en sus tarjetas.</p>
    <div className="mt-3 flex gap-4"><button disabled={!answer.trim()} className="text-blue-700 disabled:opacity-40" onClick={() => respond(false)}>Guardar respuesta</button><button onClick={() => respond(true)}>No lo sé / Omitir</button></div>
    {error && <p role="alert">{error}</p>}</section>
}
