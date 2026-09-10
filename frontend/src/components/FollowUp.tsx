import { useState } from 'react'
import { readStored, writeStored } from '../data/visitStore'
import type { EquipmentDraft } from '../data/observationApi'
import { nextFollowUp, followUpAnswer } from '../data/followUp'
import { assistantCopy, fieldLabel, type UserLanguage } from '../data/language'

export default function FollowUp({ observationId, equipment, update, language = 'es' }: {
  observationId: string
  equipment: EquipmentDraft[]
  update: (id: string, field: keyof EquipmentDraft, value: string) => void
  language?: UserLanguage
}) {
  const key = `follow-up:${observationId}`
  const [answered, setAnswered] = useState<string[]>(() => readStored(key, []))
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const question = nextFollowUp(equipment, answered)
  const copy = assistantCopy[language]
  if (answered.length >= 2 || !question) return null
  const respond = (unknown: boolean) => {
    const next = [...answered, question.id]
    try {
      const response = unknown ? { field: question.field, value: '' } : followUpAnswer(question.field, answer)
      writeStored(key, next)
      update(question.item.id, response.field, response.value)
      setAnswered(next)
      setAnswer('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the answer.')
    }
  }
  return <section className="panel mt-5">
    <p className="font-semibold">{answered.length + 1}/2 · {question.item.type}</p>
    <label className="mt-3 block">{copy.question} {fieldLabel[language][question.field]}?
      <input value={answer} onChange={event => setAnswer(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3" />
    </label>
    <p className="mt-2 text-xs text-slate-500">{copy.note}</p>
    <div className="mt-3 flex gap-4"><button disabled={!answer.trim()} className="text-blue-700 disabled:opacity-40" onClick={() => respond(false)}>{copy.save}</button><button onClick={() => respond(true)}>{copy.skip}</button></div>
    {error && <p role="alert">{error}</p>}
  </section>
}
