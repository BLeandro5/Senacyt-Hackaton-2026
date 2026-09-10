import type { Equipment } from './visitStore'

export type EvidenceStatus =
  | 'Confirmed'
  | 'Reported'
  | 'Estimated'
  | 'Unknown'

export type ReliabilityLevel = 'Low' | 'Medium' | 'High'
export type FreshnessStatus = 'Fresh' | 'Aging' | 'Stale' | 'Unknown'

export type ReliabilityBreakdown = {
  informationQuality: number
  humanValidation: number
  freshness: number
  corroboration: number
  conflictPenalty: number
}

export type ReliabilityPreview = {
  score: number
  level: ReliabilityLevel
  factors: string[]
  breakdown: ReliabilityBreakdown
  daysSinceObservation: number | null
  freshness: FreshnessStatus
}

export type EquipmentAnalysisMetadata = {
  evidence_status: Record<string, EvidenceStatus>
  reliability: ReliabilityPreview
}

export type AnalysisResult = {
  detected_language?: 'es' | 'en' | 'pt' | 'other'
  facility?: string | null
  city?: string | null
  country?: string | null
  original_text: string
  equipment: {
    modality: string
    manufacturer: string | null
    model: string | null
    configuration: string | null
    estimated_age_years: number | null
    condition: string | null
  }[]
  equipment_metadata?: EquipmentAnalysisMetadata[]
}

export type EquipmentDraft = Equipment & {
  configuration: string
  estimatedAge: string
  status: string
  evidenceStatus?: Record<string, EvidenceStatus>
  reliability?: ReliabilityPreview
}

function isReliabilityPreview(value: unknown): value is ReliabilityPreview {
  if (!value || typeof value !== 'object') return false

  const reliability = value as ReliabilityPreview
  const breakdown = reliability.breakdown

  return (
    typeof reliability.score === 'number' &&
    Number.isFinite(reliability.score) &&
    reliability.score >= 0 &&
    reliability.score <= 100 &&
    ['Low', 'Medium', 'High'].includes(reliability.level) &&
    Array.isArray(reliability.factors) &&
    reliability.factors.every((factor) => typeof factor === 'string') &&
    !!breakdown &&
    typeof breakdown === 'object' &&
    typeof breakdown.informationQuality === 'number' &&
    typeof breakdown.humanValidation === 'number' &&
    typeof breakdown.freshness === 'number' &&
    typeof breakdown.corroboration === 'number' &&
    typeof breakdown.conflictPenalty === 'number' &&
    (reliability.daysSinceObservation === null ||
      typeof reliability.daysSinceObservation === 'number') &&
    ['Fresh', 'Aging', 'Stale', 'Unknown'].includes(reliability.freshness)
  )
}

export async function analyzeObservation(
  hospitalId: string,
  text: string,
  signal: AbortSignal
): Promise<AnalysisResult> {
  const apiUrl = (
    import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000'
  ).replace(/\/$/, '')

  const response = await fetch(`${apiUrl}/observations/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // The hospital is carried as context; final persistence validates its identity.
    body: JSON.stringify({ hospital_id: hospitalId, text }),
    signal,
  })

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error(
      `El servidor devolvió una respuesta inválida (${response.status}).`
    )
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === 'string'
        ? data.detail
        : response.status === 422
          ? 'El backend no aceptó la solicitud. Reinicia FastAPI para cargar el esquema actualizado del hospital e intenta de nuevo.'
          : `No se pudo analizar (${response.status}).`
    )
  }

  const nullableText = (value: unknown) =>
    value === null || typeof value === 'string'

  const equipmentIsValid =
    Array.isArray(data?.equipment) &&
    data.equipment.every(
      (item: AnalysisResult['equipment'][number]) =>
        item &&
        typeof item.modality === 'string' &&
        item.modality.trim() &&
        nullableText(item.manufacturer) &&
        nullableText(item.model) &&
        nullableText(item.configuration) &&
        nullableText(item.condition) &&
        (item.estimated_age_years === null ||
          (typeof item.estimated_age_years === 'number' &&
            Number.isFinite(item.estimated_age_years) &&
            item.estimated_age_years >= 0))
    )

  const metadataIsValid =
    data?.equipment_metadata === undefined ||
    (Array.isArray(data.equipment_metadata) &&
      data.equipment_metadata.length === data.equipment.length &&
      data.equipment_metadata.every(
        (metadata: EquipmentAnalysisMetadata) =>
          metadata &&
          typeof metadata.evidence_status === 'object' &&
          metadata.evidence_status !== null &&
          Object.values(metadata.evidence_status).every((status) =>
            ['Confirmed', 'Reported', 'Estimated', 'Unknown'].includes(status)
          ) &&
          isReliabilityPreview(metadata.reliability)
      ))

  if (
    data?.original_text !== text ||
    !equipmentIsValid ||
    !metadataIsValid
  ) {
    throw new Error('El servidor devolvió datos de equipos inválidos.')
  }

  return data
}

export function toEquipmentDrafts(
  analysis: AnalysisResult
): EquipmentDraft[] {
  const names: Record<string, string> = {
    MRI: 'Resonador',
    CT: 'Tomógrafo',
    Ultrasound: 'Ultrasonido',
    'X-ray': 'Rayos X',
  }

  return analysis.equipment.map((item, index) => {
    const metadata = analysis.equipment_metadata?.[index]

    return {
      id: `MEDPSY-${crypto.randomUUID()}`,
      type: names[item.modality] || item.modality,
      brand: item.manufacturer ?? '',
      model: item.model ?? '',
      configuration: item.configuration ?? '',
      estimatedAge:
        item.estimated_age_years === null
          ? ''
          : `${item.estimated_age_years} años`,
      status: item.condition ?? 'Desconocido',
      evidenceStatus: metadata?.evidence_status,
      reliability: metadata?.reliability,
    }
  })
}
