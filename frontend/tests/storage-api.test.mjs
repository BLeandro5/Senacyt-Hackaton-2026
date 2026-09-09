import test from 'node:test'
import assert from 'node:assert/strict'
import { persistVisit, storageRequest } from '../src/data/storageApi.ts'
import { writeStored, readStored } from '../src/data/visitStore.ts'

function seed() {
  const values = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } })
  writeStored('current-visit', { id: 'visit-1', hospitalId: 'HOSP-001', hospitalName: 'Hospital', startedAt: '2026-09-09T12:00:00Z' })
  writeStored('current-observation', { id: 'obs-1', observation: 'Un MRI.', captureMode: 'chat' })
  writeStored('current-structured-record', { originalObservation: 'Un MRI.', equipment: [{ id: 'eq-1', type: 'MRI', brand: '', model: '' }] })
  writeStored('match-result', { decisions: [{ equipmentId: 'eq-1', type: 'new' }] })
}

test('failed server save keeps the visit and decisions for retry', async t => {
  seed()
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'No disponible' }, { status: 503 }))
  await assert.rejects(persistVisit(true), /No disponible/)
  assert.equal(readStored('current-visit', null).id, 'visit-1')
  assert.equal(readStored('match-result', null).decisions.length, 1)
  assert.equal(readStored('completed-visits', null), null)
})

test('finish clears drafts only after SQLite confirmation; retry uses the same ID', async t => {
  seed()
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.endsWith('/visits/visit-1'))
    assert.equal(options.method, 'PUT')
    const payload = JSON.parse(options.body)
    assert.equal(payload.hospitalId, 'HOSP-001')
    assert.equal(payload.observations.length, 1)
    return Response.json({ ...payload, syncStatus: 'synced', date: payload.completedAt })
  })
  await persistVisit()
  assert.ok(readStored('current-visit', null))
  const saved = await persistVisit(true)
  assert.equal(saved.syncStatus, 'synced')
  assert.equal(readStored('current-visit', null), null)
  assert.equal(readStored('completed-visits', []).length, 1)
})

test('old backend reports restart instructions without losing drafts', async t => {
  seed()
  t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'Not Found' }, { status: 404 }))
  await assert.rejects(persistVisit(), /Reinicia FastAPI/)
  assert.ok(readStored('current-visit', null))
})

test('old draft hospital can be recovered by unique catalog name', async t => {
  seed()
  const visit = readStored('current-visit', null)
  delete visit.hospitalId
  writeStored('current-visit', visit)
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/hospitals')) return Response.json([{ id: 'HOSP-001', name: 'Hospital' }])
    const payload = JSON.parse(options.body)
    assert.equal(payload.hospitalId, 'HOSP-001')
    return Response.json({ ...payload, syncStatus: 'synced' })
  })
  assert.equal((await persistVisit()).hospitalId, 'HOSP-001')
})

test('invalid server bodies provide actionable errors', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Internal Server Error', { status: 500 }))
  await assert.rejects(storageRequest('/visits'), /Comprueba el backend/)
})
