import type { Visit } from './visitStore'

export type HospitalLocation = { id: string; name: string; country?: string; city?: string; region?: string }
export const UNKNOWN_COUNTRY = 'País no informado'
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
export function observationRows(visits: Visit[], hospitals: HospitalLocation[]) {
  const catalog = new Map(hospitals.map(h => [h.id, h]))
  return visits.filter(v => !!v.completedAt).flatMap(visit => {
    const hospital = catalog.get(visit.hospitalId || '')
    return visit.observations.map(observation => ({
      key: `${visit.id}/${observation.id}`, visit, observation,
      hospitalId: visit.hospitalId || '', hospital: hospital?.name || visit.hospital,
      country: hospital?.country?.trim() || UNKNOWN_COUNTRY,
      city: hospital?.city || '', region: hospital?.region || visit.region,
    }))
  }).sort((a, b) => (b.observation.capturedAt || b.visit.completedAt).localeCompare(a.observation.capturedAt || a.visit.completedAt))
}
export function filterObservations(rows: ReturnType<typeof observationRows>, filters: { country: string; hospitalId: string; search: string }) {
  const query = normalizeSearch(filters.search)
  return rows.filter(row => (!filters.country || normalizeSearch(row.country) === normalizeSearch(filters.country))
    && (!filters.hospitalId || row.hospitalId === filters.hospitalId)
    && (!query || normalizeSearch([row.hospital, row.country, row.city, row.region, row.observation.originalText,
      row.visit.collaborator?.name || '', ...row.observation.equipment.flatMap(e => [e.type, e.brand, e.model])].join(' ')).includes(query)))
}
