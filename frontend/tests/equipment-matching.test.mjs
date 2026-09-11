import test from 'node:test'
import assert from 'node:assert/strict'
import { hasPossibleDuplicate, rankCandidates } from '../src/data/equipmentMatching.ts'

test('matching is hospital-scoped and ranks compatible models without merging', () => {
  const rows = [
    { id: 'a', hospital_id: 'HOSP-002', modality: 'CT', manufacturer: 'Philips', model: 'Incisive' },
    { id: 'b', hospital_id: 'HOSP-001', modality: 'MRI', manufacturer: 'Philips', model: 'Incisive' },
    { id: 'c', hospital_id: 'HOSP-001', modality: 'CT', manufacturer: 'Siemens', model: 'Other' },
    { id: 'd', hospital_id: 'HOSP-001', modality: 'CT', manufacturer: 'Philips', model: 'Incisive' },
  ]
  assert.deepEqual(rankCandidates(rows, 'HOSP-001', { type: 'Tomógrafo', brand: 'Philips', model: 'Incisive' }).map(a => a.id), ['d', 'c'])
  assert.equal(rows.length, 4)
})

test('only a same-hospital, same-modality asset requires duplicate review', () => {
  const rows = [
    { id: 'ct-other-hospital', hospital_id: 'HOSP-002', modality: 'CT', manufacturer: 'Philips', model: 'Incisive' },
    { id: 'mri-same-hospital', hospital_id: 'HOSP-001', modality: 'MRI', manufacturer: 'Siemens', model: 'Aera' },
  ]
  const item = { type: 'CT', brand: 'Philips', model: 'Incisive' }
  assert.equal(hasPossibleDuplicate(rows, 'HOSP-001', item), false)
  rows.push({ id: 'ct-same-hospital', hospital_id: 'HOSP-001', modality: 'CT', manufacturer: 'Other', model: 'Unknown' })
  assert.equal(hasPossibleDuplicate(rows, 'HOSP-001', item), true)
})
