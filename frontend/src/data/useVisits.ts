import { useEffect, useState } from 'react'
import { getVisits } from './visits'
import { readStored, writeStored, type Visit } from './visitStore'
import { storageRequest } from './storageApi'

export function useVisits(includeExamples = true) {
  const [visits, setVisits] = useState(() => getVisits(includeExamples))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    storageRequest<Visit[]>('/visits').then(remote => {
      if (!active) return
      const local = readStored<Visit[]>('completed-visits', [])
      const merged = [...remote, ...local.filter(v => !remote.some(r => r.id === v.id))]
      try { writeStored('completed-visits', merged) } catch { /* SQLite remains the source of saved records. */ }
      const examples = includeExamples ? getVisits(true).filter(v => !merged.some(r => r.id === v.id)) : []
      setVisits([...merged, ...examples])
      setError('')
    }).catch(() => {
      if (active) { setVisits(getVisits(includeExamples)); setError('No se pudo consultar SQLite. Mostrando la copia local; comprueba el backend.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [includeExamples])
  return { visits, error, loading }
}
