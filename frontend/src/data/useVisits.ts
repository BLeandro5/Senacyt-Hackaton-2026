import { useEffect, useState } from 'react'
import { getVisits } from './visits'
import { readStored, writeStored, type Visit } from './visitStore'
import { storageRequest } from './storageApi'

export function useVisits(includeExamples = false) {
  const [visits, setVisits] = useState(() => getVisits(false))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    storageRequest<Visit[]>('/visits').then(remote => {
      if (!active) return
      try { writeStored('completed-visits', remote) } catch { /* SQLite remains the source of saved records. */ }
      setVisits(remote)
      setError('')
    }).catch(() => {
      if (active) { setVisits(readStored<Visit[]>('completed-visits', [])); setError('No se pudo consultar SQLite. Mostrando la copia local pendiente; comprueba el backend.') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [includeExamples])
  return { visits, error, loading }
}
