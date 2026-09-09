import type { Equipment } from './visitStore'

export type EquipmentDraft = Required<Pick<Equipment, 'id' | 'type' | 'brand' | 'model' | 'configuration' | 'estimatedAge' | 'status' | 'confidence'>>

// A deliberately conservative demo parser, not an AI service. Ambiguous attributes
// stay unknown instead of being copied onto every equipment in the observation.
export function buildDemoExtraction(text: string): EquipmentDraft[] {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const kinds = [
    ['Resonador', 'resonador(?:es)?|resonancias?'],
    ['Tomógrafo', 'tomografos?'],
    ['Ultrasonido', 'ultrasonidos?'],
    ['Rayos X', 'rayos x'],
  ]
  const numbers: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 }
  const found: EquipmentDraft[] = []
  for (const [type, pattern] of kinds) {
    const match = normalized.match(new RegExp(`(?:\\b(\\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\\s+(?:equipos? de\\s+)?)?\\b(?:${pattern})\\b`))
    if (!match) continue
    const count = Math.min(20, Math.max(1, numbers[match[1]] || Number(match[1]) || 1))
    for (let i = 0; i < count; i++) found.push({ id: `TEMP-${found.length + 1}`, type, brand: '', model: '', configuration: '', estimatedAge: '', status: 'Desconocido', confidence: 80 })
  }
  if (found.length === 1) {
    const item = found[0]
    item.brand = /\bphilips\b/.test(normalized) ? 'Philips' : /\bsiemens\b/.test(normalized) ? 'Siemens' : /\bge\b/.test(normalized) ? 'GE' : ''
    item.model = /\bingenia\b/.test(normalized) ? 'Ingenia' : /\bsomatom\b/.test(normalized) ? 'Somatom' : /\blogiq\b/.test(normalized) ? 'LOGIQ' : ''
    item.configuration = /\b64 cortes\b/.test(normalized) ? '64 cortes' : /\b1[.,]5\s*t\b/.test(normalized) ? '1.5T' : /\bportatil\b/.test(normalized) ? 'Portátil' : ''
    const age = normalized.match(/\b(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*anos\b/)
    item.estimatedAge = age ? `${numbers[age[1]] || age[1]} años` : ''
    item.status = /\b(fuera de servicio|no operativo)\b/.test(normalized) ? 'Fuera de servicio' : /\boperativo\b/.test(normalized) ? 'Operativo' : 'Desconocido'
  }
  return found
}
