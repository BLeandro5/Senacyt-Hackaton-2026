import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveHospital } from '../src/data/hospitalResolution.ts'

test('quick capture resolves accents and spaces, but never guesses a missing hospital', () => {
  const catalog = [{ id: 'HOSP-001', name: 'Hospital Santo Tomás' }]
  assert.equal(resolveHospital(catalog, 'hospital  santo tomas', '')[0].id, 'HOSP-001')
  assert.equal(resolveHospital(catalog, null, 'Estoy en Hospital Santo Tomas y vi un CT.')[0].id, 'HOSP-001')
  assert.deepEqual(resolveHospital(catalog, null, 'Vi un tomógrafo Philips.'), [])
  assert.deepEqual(resolveHospital(catalog, 'Hospital Santo', ''), [])
})
