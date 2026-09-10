export type AssetCandidate = { id: string; hospital_id: string; modality: string; manufacturer: string | null; model: string | null; configuration?: string | null; estimated_age?: string | null; lastObservedAt: string }
export function normalizeModality(value: string) {
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  return ({ resonador: 'mri', resonancia: 'mri', tomografo: 'ct', tac: 'ct', ultrasonido: 'ultrasound', ecografo: 'ultrasound', ultrassom: 'ultrasound' } as Record<string, string>)[key] || key
}
export function rankCandidates(rows: AssetCandidate[], hospitalId: string, item: { type: string; brand: string; model: string; configuration?: string }) {
  const normal = (v?: string | null) => (v || '').trim().toLowerCase()
  const rank = (a: AssetCandidate) => (normal(a.manufacturer) === normal(item.brand) && item.brand ? 4 : 0)
    + (normal(a.model) === normal(item.model) && item.model ? 3 : 0)
    + (normal(a.configuration) === normal(item.configuration) && item.configuration ? 1 : 0)
  return rows.filter(a => a.hospital_id === hospitalId && normalizeModality(a.modality) === normalizeModality(item.type))
    .sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))
}
