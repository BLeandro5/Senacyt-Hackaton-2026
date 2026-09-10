export type CurrentUser = {
  id: string; firstName: string; lastName: string; name: string; cedula: string
  email: string; phone: string; role: 'field' | 'supervisor'
}

const baseUrl = () => (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function request(path: string, body: unknown): Promise<CurrentUser> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch { throw new Error('No se pudo conectar con FastAPI. Comprueba que esté iniciado e intenta de nuevo.') }
  const data = await response.json().catch(() => null)
  if (response.status === 404 || response.status === 405) throw new Error('FastAPI todavía no tiene las rutas de usuarios. Reinicia el backend con el código actualizado e intenta de nuevo.')
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'No se pudo completar la solicitud.')
  return data as CurrentUser
}

export const registerUser = (payload: { first_name: string; last_name: string; cedula: string; email: string; phone: string; password: string }) => request('/users/register', payload)
export const loginUser = (identifier: string, password: string) => request('/users/login', { identifier, password })
