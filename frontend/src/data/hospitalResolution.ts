export function normalizeHospital(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}
export function resolveHospital<T extends { id: string; name: string }>(catalog: T[], facility: string | null | undefined, note: string): T[] {
  const exact = facility ? catalog.filter(h => normalizeHospital(h.name) === normalizeHospital(facility)) : []
  if (exact.length) return exact
  const source = normalizeHospital(note)
  return catalog.filter(h => {
    const name = normalizeHospital(h.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|[^a-z0-9])${name}(?=$|[^a-z0-9])`).test(source)
  })
}
