export type AssetCandidate = { id: string; hospital_id: string; modality: string; manufacturer: string | null; model: string | null; configuration?: string | null; estimated_age?: string | null; lastObservedAt: string }
export function normalizeModality(value: string) {
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  const aliases: Record<string, string> = { mamografia: 'mammography', mamografo: 'mammography', 'rayos x': 'x-ray', radiografia: 'x-ray', ecografia: 'ultrasound', mr: 'mri', 'resonancia magnetica': 'mri' }
  if (aliases[key]) return aliases[key]
  return ({ resonador: 'mri', resonancia: 'mri', tomografo: 'ct', tac: 'ct', ultrasonido: 'ultrasound', ecografo: 'ultrasound', ultrassom: 'ultrasound' } as Record<string, string>)[key] || key
}
type ObservedItem = { type: string; brand: string; model: string; configuration?: string; estimatedAge?: string }
const age = (value?: string | null) => {
  const match = value?.match(/\d+(?:[.,]\d+)?/)
  return match ? Number(match[0].replace(',', '.')) : null
}
export function candidateReasons(candidate: AssetCandidate, item: ObservedItem) {
  const reasons = ['Mismo hospital y modalidad']
  for (const [label, left, right] of [['Marca', candidate.manufacturer, item.brand], ['Modelo', candidate.model, item.model], ['Configuración', candidate.configuration, item.configuration]]) {
    if (left && right && left.trim().toLowerCase() === right.trim().toLowerCase()) reasons.push(`${label} coincide`)
  }
  const previous = age(candidate.estimated_age), observed = age(item.estimatedAge)
  if (previous !== null && observed !== null && Math.abs(previous - observed) <= 2) reasons.push('Antigüedad similar (±2 años)')
  return reasons
}
export function rankCandidates(rows: AssetCandidate[], hospitalId: string, item: ObservedItem) {
  const normal = (v?: string | null) => (v || '').trim().toLowerCase()
  const rank = (a: AssetCandidate) => (normal(a.manufacturer) === normal(item.brand) && item.brand ? 4 : 0)
    + (normal(a.model) === normal(item.model) && item.model ? 3 : 0)
    + (normal(a.configuration) === normal(item.configuration) && item.configuration ? 1 : 0)
    + (candidateReasons(a, item).includes('Antigüedad similar (±2 años)') ? 1 : 0)
  return rows.filter(a => a.hospital_id === hospitalId && normalizeModality(a.modality) === normalizeModality(item.type))
    .sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))
}

// A same-modality record in the same hospital could still be the physical
// asset being observed. It requires human review even if other fields differ.
export function hasPossibleDuplicate(rows: AssetCandidate[], hospitalId: string, item: ObservedItem) {
  return rankCandidates(rows, hospitalId, item).length > 0
}

export function candidateSimilarity(candidate: AssetCandidate, item: { type: string; brand: string; model: string; configuration?: string }) {
  const normal = (value?: string | null) => (value || '').trim().toLowerCase()
  if (normalizeModality(candidate.modality) !== normalizeModality(item.type)) return 0
  let score = 40
  for (const [candidateValue, itemValue, weight] of [[candidate.manufacturer, item.brand, 35], [candidate.model, item.model, 20], [candidate.configuration, item.configuration, 5]] as const) {
    if (itemValue && candidateValue) score += normal(candidateValue) === normal(itemValue) ? weight : -weight
  }
  return Math.max(0, Math.min(100, score))
}
