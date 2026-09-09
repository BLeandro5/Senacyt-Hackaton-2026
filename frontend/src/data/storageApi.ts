import { finishVisit, readStored, saveObservation, writeStored, type Visit } from './visitStore.ts'
import type { CurrentUser } from './userApi.ts'

export async function storageRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
  const response = await fetch(`${base}${path}`, {
    ...options, signal: AbortSignal.timeout(20_000),
    headers: { 'Content-Type': 'application/json', ...options.headers },
  }).catch(() => { throw new Error('No se pudo conectar con FastAPI. Comprueba que esté iniciado en el puerto 8000 y reintenta; el borrador se conserva.') })
  const body = await response.json().catch(() => null)
  if (response.status === 404 || response.status === 405) throw new Error('El backend no reconoce esta operación. Reinicia FastAPI con el código actualizado e intenta de nuevo; el borrador sigue guardado.')
  if (!response.ok) throw new Error(typeof body?.detail === 'string' ? body.detail :
    response.status === 422 ? 'Hay campos incompletos o inválidos. Revisa los equipos antes de guardar.' : 'No se pudo guardar la visita. Comprueba el backend y reintenta.')
  if (body === null) throw new Error('El backend devolvió una respuesta inválida.')
  return body as T
}

export async function persistVisit(completed = false): Promise<Visit> {
  const current = saveObservation()
  if (!current.hospitalId) {
    const catalog = await storageRequest<{ id: string; name: string }[]>('/hospitals')
    const matches = catalog.filter(h => h.name.trim().toLowerCase() === current.hospitalName.trim().toLowerCase())
    if (matches.length !== 1) throw new Error('No se pudo identificar el hospital del borrador. Revisa el hospital antes de guardar.')
    current.hospitalId = matches[0].id
    writeStored('current-visit', current)
  }
  const now = new Date().toISOString()
  const user = readStored<CurrentUser | null>('demo-user', null)
  if (!current.collaboratorId && user?.role === 'field') current.collaboratorId = user.id
  const payload = {
    id: current.id, hospitalId: current.hospitalId, hospital: current.hospitalName,
    area: current.area || '', region: current.region || '', startedAt: current.startedAt || now,
    completedAt: completed ? now : '', collaboratorId: current.collaboratorId, observations: current.observations,
  }
  const saved = await storageRequest<Visit>(`/visits/${encodeURIComponent(current.id)}`, { method: 'PUT', body: JSON.stringify(payload) })
  if (completed) finishVisit(saved)
  return saved
}
