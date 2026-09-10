import type { Equipment } from './visitStore'

export type AnalysisResult = {
  detected_language?: 'es' | 'en' | 'pt' | 'other'
  facility?: string | null; city?: string | null; country?: string | null
  original_text: string
  equipment: {
    modality: string
    manufacturer: string | null
    model: string | null
    configuration: string | null
    estimated_age_years: number | null
    condition: string | null
  }[]
}
export type EquipmentDraft = Equipment & {
  configuration: string; estimatedAge: string; status: string
}
export type SimilarVisit = { visitId: string; observationId: string; completedAt: string; originalText: string; similarity: number }
export type VisitSimilarity = { isDuplicate: boolean; highestSimilarity: number; matches: SimilarVisit[] }

export async function analyzeObservation(hospitalId: string, text: string, signal: AbortSignal): Promise<AnalysisResult> {
  const apiUrl = (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
  const response = await fetch(`${apiUrl}/observations/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    // The hospital is carried as context; final persistence validates its identity.
    body: JSON.stringify({ hospital_id: hospitalId, text }),
    signal,
  })
  let data
  try { data = await response.json() }
  catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) }
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : response.status === 422
    ? 'El backend no aceptó la solicitud. Reinicia FastAPI para cargar el esquema actualizado del hospital e intenta de nuevo.'
    : `No se pudo analizar (${response.status}).`)
  const nullableText = (value: unknown) => value === null || typeof value === 'string'
  if (data?.original_text !== text || !Array.isArray(data.equipment) || !data.equipment.every((item: AnalysisResult['equipment'][number]) =>
    item && typeof item.modality === 'string' && item.modality.trim() &&
    nullableText(item.manufacturer) && nullableText(item.model) && nullableText(item.configuration) && nullableText(item.condition) &&
    (item.estimated_age_years === null || (typeof item.estimated_age_years === 'number' && Number.isFinite(item.estimated_age_years) && item.estimated_age_years >= 0)))) {
    throw new Error('El servidor devolvió datos de equipos inválidos.')
  }
  return data
}

export async function findSimilarVisits(hospitalId: string, text: string, signal: AbortSignal): Promise<VisitSimilarity> {
  const apiUrl = (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
  const response = await fetch(`${apiUrl}/visits/similarity`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hospitalId, text }), signal,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data || !Array.isArray(data.matches) || typeof data.highestSimilarity !== 'number') {
    throw new Error('No se pudo comprobar si la visita ya existe.')
  }
  return data as VisitSimilarity
}

export function toEquipmentDrafts(analysis: AnalysisResult): EquipmentDraft[] {
  const names: Record<string, string> = { MRI: 'Resonador', CT: 'Tomógrafo', Ultrasound: 'Ultrasonido', Mammography: 'Mamografía', 'X-ray': 'Rayos X' }
  return analysis.equipment.map(item => ({
    id: `MEDPSY-${crypto.randomUUID()}`,
    type: names[item.modality] || item.modality,
    brand: item.manufacturer ?? '', model: item.model ?? '', configuration: item.configuration ?? '',
    estimatedAge: item.estimated_age_years === null ? '' : `${item.estimated_age_years} años`,
    status: item.condition ?? 'Desconocido',
    fieldStatuses: {
      modality: 'Reported', manufacturer: item.manufacturer ? 'Reported' : 'Unknown',
      model: item.model ? 'Reported' : 'Unknown', configuration: item.configuration ? 'Reported' : 'Unknown',
      age: item.estimated_age_years === null ? 'Unknown' : 'Reported',
      condition: item.condition ? 'Reported' : 'Unknown', quantity: 'Reported',
    },
  }))
}
