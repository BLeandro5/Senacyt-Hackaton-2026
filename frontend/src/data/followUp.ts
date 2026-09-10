import type { EquipmentDraft } from './observationApi'
const fields = [['brand','marca'], ['estimatedAge','edad aproximada'], ['model','modelo'], ['configuration','configuración'], ['status','estado']] as const
const normal = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
export function unknownAnswer(value: string) {
  return /^(no (lo )?se|i don.t know|nao sei|unknown|desconocid[oa]|desconhecid[oa])[.!]?$/.test(normal(value))
}
export function nextFollowUp(equipment: EquipmentDraft[], answered: string[]) {
  if (answered.length >= 2) return undefined
  return equipment.flatMap((item,index) => fields.map(([field,label]) => ({ item, field, label, index, id: `${item.id}:${field}` })))
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

export function followUpAnswer(field: string, answer: string) {
  const conversationalAge = answer.match(/\b(\d+(?:[.,]\d+)?|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s+(?:aproximadamente|aprox(?:\.|imadamente)?|about|around|roughly|cerca de))?\s*(a(?:ños|nos)|years)\b/i)
  if (conversationalAge) {
    return { field: 'estimatedAge' as const, value: `${conversationalAge[1]} ${conversationalAge[2]}` }
  }
  if (/\b(no\s+(?:lo\s+)?se|i\s+don.t\s+know|nao\s+sei|unknown|desconocid[oa]|desconhecid[oa])\b/i.test(normal(answer))) {
    return { field: field as 'brand' | 'model' | 'configuration' | 'estimatedAge' | 'status', value: '' }
  }
  const age = answer.match(/\b(\d+(?:[.,]\d+)?|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|one|two|three|four|five|six|seven|eight|nine|ten)\s*(años|anos|years)\b/i)
  if (age) return { field: 'estimatedAge' as const, value: age[0] }
  return { field: field as 'brand' | 'model' | 'configuration' | 'estimatedAge' | 'status', value: followUpValue(field, answer) }
}
