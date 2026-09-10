import type { AnalysisResult } from './observationApi'

export type Equipment = {
  reviewed?: boolean
  id: string; type: string; brand: string; model: string
  configuration?: string; estimatedAge?: string; status?: string; confidence?: number
  resolution?: 'existing' | 'new' | 'review'; matchedEquipmentId?: string
}
export type Observation = {
  detectedLanguage?: string; analysis?: AnalysisResult
  id: string; title?: string; visitId?: string; captureMode: 'chat' | 'voice'
  capturedAt?: string; originalText: string; equipment: Equipment[]; photoName?: string | null; photoData?: string
}
export type Visit = {
  hospitalId?: string
  collaboratorId?: string
  collaborator?: { id: string; firstName: string; lastName: string; name: string; cedula: string } | null
  id: string; hospital: string; area: string; region: string; date: string
  startedAt: string; completedAt: string; syncStatus: 'synced' | 'pending'; observations: Observation[]
}
export type CurrentVisit = {
  id?: string; hospitalId?: string; collaboratorId?: string; hospitalName: string; area?: string; region?: string
  startedAt?: string; observations?: Observation[]
}
export type Capture = CurrentVisit & {
  analysis?: AnalysisResult
  id?: string; visitId?: string; observation: string; captureMode: 'chat' | 'voice'
  capturedAt: string; photoName?: string | null; photoData?: string
}
export type RecordDraft = CurrentVisit & {
  originalObservation: string; equipment: Equipment[]; observationId?: string
}
export type Decision = { equipmentId: string; type: 'existing' | 'new' | 'review'; matchedEquipmentId?: string; similarity?: number }

// Keep the original keys readable; do not delete malformed data or old backups.
export function readStored<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}
export function writeStored(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}
export function observationTitle(equipment: Equipment[]) {
  if (equipment.length === 1) return [equipment[0].type || 'Equipo no informado', equipment[0].brand, equipment[0].model].filter(v => v && !/desconocid|no informad/i.test(v)).join(' ')
  const counts = new Map<string, number>()
  equipment.forEach(item => {
    const name = item.type.trim() || 'Equipo no informado'
    counts.set(name, (counts.get(name) || 0) + 1)
  })
  return [...counts].map(([name, count]) => count > 1 ? `${count} × ${name}` : name).join(' + ') || 'Sin equipos registrados'
}
export function clearObservation() {
  for (const key of ['current-observation', 'current-structured-record', 'match-result', 'capture-draft', 'review-draft', 'match-draft']) localStorage.removeItem(key)
}
export function resumePath() {
  if (readStored('match-result', null) && readStored('current-structured-record', null)) return '/visits/new/success'
  if (readStored('current-structured-record', null)) return '/visits/new/match'
  if (readStored('current-observation', null)) return '/visits/new/review'
  return '/visits/new/capture'
}
export function saveObservation() {
  const visit = readStored<CurrentVisit | null>('current-visit', null)
  const capture = readStored<Capture | null>('current-observation', null)
  const record = readStored<RecordDraft | null>('current-structured-record', null)
  const result = readStored<{ decisions: Decision[] }>('match-result', { decisions: [] })
  if (!visit || !capture || !record || !record.equipment.length) throw new Error('Completa la revisión antes de guardar.')
  if (!record.equipment.every(e => result.decisions.some(d => d.equipmentId === e.id))) throw new Error('Faltan decisiones de equipos.')
  const visitId = visit.id || `VIS-${visit.startedAt || crypto.randomUUID()}`
  const id = capture.id || `OBS-${capture.capturedAt}`
  const observation: Observation = {
    id, visitId, title: observationTitle(record.equipment), captureMode: capture.captureMode,
    capturedAt: capture.capturedAt, originalText: record.originalObservation,
    photoName: capture.photoName, photoData: capture.photoData,
    analysis: capture.analysis, detectedLanguage: capture.analysis?.detected_language || 'other',
    equipment: record.equipment.map(e => {
      const decision = result.decisions.find(d => d.equipmentId === e.id)!
      return { ...e, resolution: decision.type, matchedEquipmentId: decision.matchedEquipmentId }
    }),
  }
  const updated = { ...visit, id: visitId, observations: [...(visit.observations || []).filter(o => o.id !== id), observation] }
  writeStored('current-visit', updated)
  return updated
}
export function finishVisit(confirmed?: Visit) {
  const current = saveObservation()
  const now = new Date().toISOString()
  const visit: Visit = confirmed ?? {
    id: current.id, hospitalId: current.hospitalId, hospital: current.hospitalName, area: current.area || 'No informada', region: current.region || 'No informada',
    date: now, startedAt: current.startedAt || now, completedAt: now, syncStatus: 'pending', observations: current.observations,
  }
  const visits = readStored<Visit[]>('completed-visits', [])
  writeStored('completed-visits', [visit, ...visits.filter(v => v.id !== visit.id)])
  writeStored('last-completed-visit', { visit: current, completedAt: now, equipmentProcessed: current.observations.reduce((n,o) => n + o.equipment.length, 0) })
  clearObservation()
  localStorage.removeItem('current-visit')
  return visit
}
export function displayDate(value: string, timeOnly = false) {
  if (!value.includes('T')) return value || 'No informada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No informada'
  return timeOnly ? date.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' }) : date.toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' })
}
