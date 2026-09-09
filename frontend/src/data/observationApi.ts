import type { Equipment } from './visitStore'

export type AnalysisResult = {
  original_text: string
  equipment: {
    modality: string
    manufacturer: string | null
    model: string | null
    estimated_age_years: number | null
    condition: string | null
  }[]
}
export type EquipmentDraft = Equipment & {
  configuration: string; estimatedAge: string; status: string
}

export async function analyzeObservation(text: string, signal: AbortSignal): Promise<AnalysisResult> {
  const apiUrl = (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
  const response = await fetch(`${apiUrl}/observations/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    // Hospital API integration is pending; the extractor currently uses text only.
    body: JSON.stringify({ hospital_id: 1, text }),
    signal,
  })
  let data
  try { data = await response.json() }
  catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) }
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : `No se pudo analizar (${response.status}).`)
  const nullableText = (value: unknown) => value === null || typeof value === 'string'
  if (data?.original_text !== text || !Array.isArray(data.equipment) || !data.equipment.every((item: AnalysisResult['equipment'][number]) =>
    item && typeof item.modality === 'string' && item.modality.trim() &&
    nullableText(item.manufacturer) && nullableText(item.model) && nullableText(item.condition) &&
    (item.estimated_age_years === null || (typeof item.estimated_age_years === 'number' && Number.isFinite(item.estimated_age_years) && item.estimated_age_years >= 0)))) {
    throw new Error('El servidor devolvió datos de equipos inválidos.')
  }
  return data
}

export function toEquipmentDrafts(analysis: AnalysisResult): EquipmentDraft[] {
  const names: Record<string, string> = { MRI: 'Resonador', CT: 'Tomógrafo', Ultrasound: 'Ultrasonido', 'X-ray': 'Rayos X' }
  return analysis.equipment.map(item => ({
    id: `MEDPSY-${crypto.randomUUID()}`,
    type: names[item.modality] || item.modality,
    brand: item.manufacturer ?? '', model: item.model ?? '', configuration: '',
    estimatedAge: item.estimated_age_years === null ? '' : `${item.estimated_age_years} años`,
    status: item.condition ?? 'Desconocido',
  }))
}
