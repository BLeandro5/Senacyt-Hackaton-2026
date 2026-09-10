import type { EquipmentDraft } from './observationApi'
const fields = [['brand','marca'], ['estimatedAge','edad aproximada'], ['model','modelo'], ['configuration','configuración'], ['status','estado']] as const
const normal = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
export function unknownAnswer(value: string) {
  return /^(no (lo )?se|i don.t know|nao sei|unknown|desconocid[oa]|desconhecid[oa])[.!]?$/.test(normal(value))
}
export function nextFollowUp(equipment: EquipmentDraft[], answered: string[]) {
  if (answered.length >= 2) return undefined
  return fields.flatMap(([field,label]) => equipment.map((item,index) => ({ item, field, label, index, id: `${item.id}:${field}` })))
    .find(q => (!q.item[q.field] || unknownAnswer(q.item[q.field])) && !answered.includes(q.id))
}
export function followUpValue(field: string, answer: string) {
  if (unknownAnswer(answer)) return ''
  if (field === 'brand') {
    const brands = answer.match(/\b(Philips|Siemens|GE|Canon|Toshiba|Samsung|Mindray|Fujifilm|Hitachi)\b/gi) || []
    if (new Set(brands.map(normal)).size > 1) throw new Error('Indica la marca de este equipo solamente; corrige el otro en su tarjeta.')
    if (brands.length) return brands[0]!
  }
  if (answer.trim().length > 120) throw new Error('Usa un valor breve para este atributo. La nota original permanece sin cambios.')
  return answer.trim()
}
