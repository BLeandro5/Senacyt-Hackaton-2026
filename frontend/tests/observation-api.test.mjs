import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeObservation, toEquipmentDrafts } from '../src/data/observationApi.ts'
import { writeStored, saveObservation } from '../src/data/visitStore.ts'

const text = 'Dos resonadores Siemens y un CT Philips de siete años.'
const response = {
  original_text: text,
  equipment: [
    { modality: 'MRI', manufacturer: 'Siemens', model: null, configuration: null, estimated_age_years: null, condition: null },
    { modality: 'MRI', manufacturer: 'Siemens', model: null, configuration: null, estimated_age_years: null, condition: null },
    { modality: 'CT', manufacturer: 'Philips', model: null, configuration: '64 cortes', estimated_age_years: 7, condition: null },
  ],
}

test('capture request, review mapping and saved visit preserve actual equipment', async t => {
  const signal = new AbortController().signal
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8000/observations/analyze')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['Content-Type'], 'application/json')
    assert.equal(options.signal, signal)
    assert.deepEqual(JSON.parse(options.body), { hospital_id: 'HOSP-001', text })
    return Response.json(response)
  })
  const analysis = await analyzeObservation('HOSP-001', text, signal)
  const equipment = toEquipmentDrafts(analysis)
  assert.deepEqual(equipment.map(e => [e.type, e.brand, e.estimatedAge]), [
    ['Resonador', 'Siemens', ''], ['Resonador', 'Siemens', ''], ['Tomógrafo', 'Philips', '7 años'],
  ])
  assert.equal(new Set(equipment.map(e => e.id)).size, 3)
  assert.ok(equipment.every(e => e.confidence === undefined))
  const values = new Map()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key),
  } })
  writeStored('current-visit', { id: 'VIS-1', hospitalName: 'Hospital prueba' })
  writeStored('current-observation', { id: 'OBS-1', observation: text, analysis, captureMode: 'chat' })
  writeStored('current-structured-record', { originalObservation: text, equipment })
  writeStored('match-result', { decisions: equipment.map(e => ({ equipmentId: e.id, type: 'new' })) })
  assert.equal(saveObservation().observations[0].equipment.length, 3)
  assert.equal(saveObservation().observations[0].originalText, text)
})

test('empty model result stays empty', () => {
  assert.deepEqual(toEquipmentDrafts({ original_text: 'Sala vacía', equipment: [] }), [])
})

test('backend errors and malformed responses do not create demo data', async t => {
  for (const result of [
    Response.json({ detail: 'QVAC no disponible' }, { status: 503 }),
    Response.json({ ...response, original_text: 'Texto de otra captura' }),
    Response.json({ original_text: text, equipment: [null] }),
    new Response('not JSON'),
  ]) {
    t.mock.method(globalThis, 'fetch', async () => result)
    await assert.rejects(() => analyzeObservation('HOSP-001', text, new AbortController().signal))
  }
})
