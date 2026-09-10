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

test('merged review preserves AI age ranges and speech workflow metadata together', () => {
  const reliability = { score: 60, level: 'Medium', reasons: [] }
  const drafts = toEquipmentDrafts({
    original_text: 'Observación transcrita',
    equipment: [
      { modality: 'MRI', manufacturer: 'GE', model: null, configuration: '1.5T', estimated_age_years: 11, age_description: 'Entre 10 y 12 años', condition: null },
      { modality: 'Mammography', manufacturer: 'Hologic', model: null, configuration: null, estimated_age_years: 6, condition: null },
    ],
    equipment_metadata: [
      { evidence_status: { age: 'Estimated', configuration: 'Reported', quantity: 'Confirmed' }, reliability, estimated_installation_year: 2015, installation_year_status: 'Estimated' },
      { evidence_status: { age: 'Estimated' }, reliability },
    ],
  })
  assert.equal(drafts[0].estimatedAge, 'Entre 10 y 12 años')
  assert.equal(drafts[0].configuration, '1.5T')
  assert.equal(drafts[0].fieldStatuses.age, 'Estimated')
  assert.equal(drafts[0].fieldStatuses.quantity, 'Confirmed')
  assert.equal(drafts[0].fieldStatuses.model, 'Unknown')
  assert.equal(drafts[0].estimatedInstallationYear, 2015)
  assert.deepEqual(drafts[0].reliability, reliability)
  assert.deepEqual(drafts.map(item => item.sourceIndex), [0, 1])
  assert.equal(drafts[1].type, 'Mamografía')
  assert.equal(drafts[1].estimatedAge, '6 años')
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
