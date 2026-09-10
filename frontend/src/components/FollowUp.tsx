import { useState } from 'react'
import { readStored, writeStored } from '../data/visitStore'
import type { EquipmentDraft, AnalysisResult } from '../data/observationApi'
import { nextFollowUp, followUpAnswer } from '../data/followUp'
import { assistantCopy, fieldLabel, type UserLanguage } from '../data/language'

export default function FollowUp({ observationId, equipment, update, candidates = [], language = 'es' }: {
  language?: UserLanguage
  candidates?: AnalysisResult['follow_up_candidates']; observationId: string; equipment: EquipmentDraft[]; update: (id: string, field: keyof EquipmentDraft, value: string) => void
}) {
  const key = `follow-up:${observationId}`
  const [answered, setAnswered] = useState<string[]>(() => readStored(key, []))
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const copy = assistantCopy[language]
  const [quantityType,setQuantityType]=useState<'exact'|'estimated'|'unknown'>('estimated')
  const [quantityCount,setQuantityCount]=useState(String(equipment.length))
  const fieldMap = { manufacturer:'brand',age:'estimatedAge',model:'model',configuration:'configuration',condition:'status',quantity:'quantityStatus' } as const
  const proposed = candidates.flatMap(candidate => {
    const index = equipment.findIndex(item => item.sourceIndex === candidate.equipment_index)
    const item = equipment[index]
    const field = fieldMap[candidate.field]
    if (!item || (candidate.field !== 'quantity' && item[field] && !/desconocid|unknown/i.test(String(item[field])))) return []
    const id = candidate.field === 'quantity' ? 'quantity' : `${item.id}:${field}`
    return answered.includes(id) ? [] : [{ item, field, label: candidate.question, index, id, prompt: candidate.question }]
  })[0]
  const fallback = nextFollowUp(equipment, answered)
  const question = proposed || (fallback ? { ...fallback, prompt: `¿Conoces la ${fallback.label} de este equipo?` } : undefined)
  const questionText = question?.field === 'quantityStatus'
    ? ({ es: '¿Cuántos equipos observaste y qué tan exacta es la cantidad?', en: 'How many devices did you observe, and is the quantity exact?', pt: 'Quantos equipamentos você observou e a quantidade é exata?' })[language]
    : question ? `${copy.question} ${fieldLabel[language][question.field]}?` : ''
  if (answered.length >= 2 || !question) return null
  const respond = (unknown: boolean) => {
    const next = [...answered, question.id]
    try {
      if (question.field === 'quantityStatus' && !unknown && Number(quantityCount) !== equipment.length) throw new Error('Ajusta primero el número de tarjetas de equipos en Review para que coincida con la cantidad confirmada.')
      const response = question.field === 'quantityStatus'
        ? { field: 'quantityStatus' as const, value: unknown ? 'unknown' : quantityType }
        : unknown ? { field: question.field, value: '' } : followUpAnswer(question.field, answer)
      writeStored(key, next)
      if(question.field === 'quantityStatus') equipment.forEach(item=>update(item.id,'quantityStatus',response.value))
      else update(question.item.id, response.field, response.value)
      setAnswered(next); setAnswer('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la respuesta.') }
  }
  return <section className="panel mt-5"><p className="font-semibold">Pregunta {answered.length + 1} de 2 · Equipo {question.index + 1}: {question.item.type}</p>
<label className="mt-3 block">{questionText}{question.field==='quantityStatus' ? <span className="mt-2 flex gap-3"><input aria-label="Cantidad observada" type="number" min={1} max={50} className="w-24 rounded-xl border p-3" value={quantityCount} onChange={e=>setQuantityCount(e.target.value)}/><select aria-label="Certeza de cantidad" className="rounded-xl border p-3" value={quantityType} onChange={e=>setQuantityType(e.target.value as typeof quantityType)}><option value="exact">Exacta</option><option value="estimated">Aproximada</option><option value="unknown">No sé</option></select></span> : <input value={answer} onChange={e => setAnswer(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3" />}</label>
    <p className="mt-2 text-xs text-slate-500">{copy.note}</p>
    <div className="mt-3 flex gap-4"><button disabled={question.field !== 'quantityStatus' && !answer.trim()} className="text-blue-700 disabled:opacity-40" onClick={() => respond(false)}>{copy.save}</button><button onClick={() => respond(true)}>{copy.skip}</button></div>
    {error && <p role="alert">{error}</p>}</section>
}
