import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDemoExtraction } from '../src/data/demoExtraction.ts'
import { writeStored, readStored, saveObservation, finishVisit, clearObservation, resumePath, observationTitle } from '../src/data/visitStore.ts'

const values = new Map()
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
}, configurable: true })

test('demo extraction preserves counts and never fabricates a fallback equipment', () => {
  assert.equal(buildDemoExtraction('No hay información suficiente').length, 0)
  const items = buildDemoExtraction('Dos resonadores y un tomógrafo. Uno es Philips.')
  assert.equal(items.length, 3)
  assert.ok(items.every(e => e.brand === '' && e.model === ''))
  assert.equal(buildDemoExtraction('tres ultrasonidos y un rayos X').length, 4)
  assert.equal(buildDemoExtraction('un resonador')[0].type, 'Resonador')
  const single = buildDemoExtraction('Tomógrafo Siemens Somatom de 64 cortes, ocho años, no operativo')[0]
  assert.equal(single.status, 'Fuera de servicio')
  assert.equal(single.estimatedAge, '8 años')
  assert.equal(single.brand, 'Siemens')
})

test('save, reload and finish preserve multiple observations without duplicates', () => {
  values.clear()
  writeStored('current-visit', { hospitalName: 'Hospital prueba', area: 'UCI', startedAt: '2026-09-09T12:00:00Z' })
  const equipment = buildDemoExtraction('un resonador')
  const seed = id => {
    writeStored('current-observation', { id, observation: 'un resonador', captureMode: 'voice', capturedAt: '2026-09-09T12:01:00Z', photoName: 'equipo.png' })
    writeStored('current-structured-record', { originalObservation: 'un resonador', equipment })
    writeStored('match-result', { decisions: [{ equipmentId: equipment[0].id, type: 'existing', matchedEquipmentId: 'EQ-1' }] })
  }
  seed('OBS-A')
  const first = saveObservation()
  saveObservation()
  assert.equal(readStored('current-visit', null).observations.length, 1)
  assert.equal(resumePath(), '/visits/new/success')
  clearObservation()
  assert.equal(resumePath(), '/visits/new/capture')
  assert.equal(readStored('current-visit', null).area, 'UCI')
  seed('OBS-B')
  const completed = finishVisit()
  assert.equal(completed.id, first.id)
  assert.equal(completed.observations.length, 2)
  assert.equal(completed.syncStatus, 'pending')
  assert.equal(completed.observations[0].equipment[0].matchedEquipmentId, 'EQ-1')
  assert.equal(completed.observations[0].photoName, 'equipo.png')
  assert.equal(readStored('current-visit', null), null)
  assert.equal(readStored('completed-visits', []).length, 1)
  assert.ok(completed.observations.every(o => o.title && o.visitId === completed.id))
})

test('incomplete decisions cannot save or clear the visit', () => {
  values.clear()
  writeStored('current-visit', { hospitalName: 'Hospital prueba' })
  writeStored('current-observation', { id: 'OBS', capturedAt: 'now' })
  writeStored('current-structured-record', { equipment: buildDemoExtraction('dos resonadores') })
  assert.throws(saveObservation, /Faltan decisiones/)
  assert.ok(readStored('current-visit', null))
  assert.equal(readStored('completed-visits', []).length, 0)
})

test('malformed old JSON stays untouched and unknown attributes do not become titles', () => {
  values.set('legacy', '{invalid')
  assert.equal(readStored('legacy', null), null)
  assert.equal(values.get('legacy'), '{invalid')
  assert.equal(observationTitle([{ type: 'Ultrasonido', brand: 'GE', model: 'LOGIQ' }]), 'Ultrasonido GE LOGIQ')
})
