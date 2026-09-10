import test from 'node:test'
import assert from 'node:assert/strict'
import { rankCandidates } from '../src/data/equipmentMatching.ts'

test('Spanish mammography and X-ray find existing English and Spanish assets only in the selected hospital', () => {
  for (const [type, modality] of [['Mamografía', 'Mammography'], ['Rayos X', 'X-ray'], ['Mamografía', 'mamografia']]) {
    const asset = { id: 'existing', hospital_id: 'HOSP-001', modality, manufacturer: 'Philips', model: null }
    const rows = [asset, { ...asset, id: 'other', hospital_id: 'HOSP-002' }]
    assert.deepEqual(rankCandidates(rows, 'HOSP-001', { type, brand: 'Philips', model: '' }).map(a => a.id), ['existing'])
  }
})
