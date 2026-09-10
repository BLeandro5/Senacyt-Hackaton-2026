import test from 'node:test'
import assert from 'node:assert/strict'
import { discardVisitForHospital, readStored, writeStored } from '../src/data/visitStore.ts'

test('selecting another hospital discards drafts, preserving completed visits and the user', () => {
  const values = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key),
  } })
  writeStored('current-visit', { hospitalId: 'HOSP-001', hospitalName: 'Uno' })
  for (const key of ['current-observation', 'current-structured-record', 'match-result', 'capture-draft', 'review-draft', 'match-draft']) writeStored(key, { text: 'Borrador anterior' })
  writeStored('completed-visits', [{ id: 'FINAL-1' }])
  writeStored('demo-user', { name: 'Colaborador' })
  assert.equal(discardVisitForHospital('HOSP-001'), false)
  assert.ok(readStored('current-observation', null))
  assert.equal(discardVisitForHospital('HOSP-002'), true)
  assert.equal(readStored('current-visit', null), null)
  for (const key of ['current-observation', 'current-structured-record', 'match-result', 'capture-draft', 'review-draft', 'match-draft']) assert.equal(readStored(key, null), null)
  assert.deepEqual(readStored('completed-visits', []), [{ id: 'FINAL-1' }])
  assert.equal(readStored('demo-user', {}).name, 'Colaborador')
})
