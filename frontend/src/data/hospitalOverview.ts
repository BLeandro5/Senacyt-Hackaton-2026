export type Hospital = { id: string; name: string; region: string; city: string }
export type HospitalEquipment = {
  id: string; type: string; brand: string; model: string; estimatedAge: string
  status: string; configuration: string; observationId: string; visitId: string
  originalText: string; area: string; recordedAt: string
}
export type HospitalOverview = {
  hospital: Hospital
  summary: { visits: number; observations: number; equipmentRecords: number; lastVisit: string | null }
  equipment: HospitalEquipment[]
  visits: { id: string; area: string; completedAt: string; observationCount: number }[]
}
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function filterHospitalEquipment(items: HospitalEquipment[], query: string, area: string, type: string) {
  const needle = normalized(query.trim())
  return items.filter(item => (!area || item.area === area) && (!type || item.type === type) &&
    normalized([item.type, item.brand, item.model, item.area, item.status].join(' ')).includes(needle))
}
