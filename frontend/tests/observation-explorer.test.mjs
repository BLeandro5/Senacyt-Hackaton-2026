import test from 'node:test'
import assert from 'node:assert/strict'
import { observationRows, filterObservations, UNKNOWN_COUNTRY } from '../src/data/observationExplorer.ts'

const hospitals = [{ id: 'h1', name: 'Hospital A', country: 'Panamá', city: 'Panamá' }, { id: 'h2', name: 'Hospital B', country: 'Brasil' }]
function visit(id, hospitalId, name) {
  return { id, hospitalId, hospital: 'Historical name', completedAt: '2026-09-10T10:00:00Z', collaborator: { name }, observations: [{ id: 'same-observation-id', originalText: 'Un CT Philips.', equipment: [{ id: 'e1', type: 'CT', brand: 'Philips', model: '' }] }] }
}
test('general observations include different collaborators and preserve source identity', () => {
  const rows = observationRows([visit('v1','h1','Ana'), visit('v2','h1','Luis'), visit('v3','h2','Maria')], hospitals)
  assert.equal(rows.length,3)
  assert.equal(new Set(rows.map(r => r.key)).size,3)
  assert.equal(filterObservations(rows,{ country:'panama',hospitalId:'',search:'' }).length,2)
  assert.equal(filterObservations(rows,{ country:'Brasil',hospitalId:'h1',search:'' }).length,0)
  assert.equal(filterObservations(rows,{ country:'',hospitalId:'h1',search:'Luis' }).length,1)
  assert.equal(filterObservations(rows,{ country:'',hospitalId:'',search:'Philips' }).length,3)
})
test('missing geography stays visible and unfinished visits stay out', () => {
  const complete = visit('v1','missing','Ana')
  const ongoing = { ...visit('v2','h1','Ana'), completedAt:'' }
  const rows=observationRows([complete,ongoing],hospitals)
  assert.equal(rows.length,1)
  assert.equal(rows[0].country,UNKNOWN_COUNTRY)
  assert.equal(rows[0].observation.originalText,'Un CT Philips.')
})
