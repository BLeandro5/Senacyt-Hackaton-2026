import test from 'node:test'
import assert from 'node:assert/strict'
import { nextFollowUp, followUpAnswer, followUpValue, unknownAnswer } from '../src/data/followUp.ts'

test('follow-up targets one device, respects unknown answers and stops at two', () => {
  const equipment = [{ id: 'one', type: 'CT', brand: '' }, { id: 'two', type: 'CT', brand: '' }]
  const first = nextFollowUp(equipment, [])
  assert.deepEqual(followUpAnswer('brand', 'One is about six years old.'), { field: 'estimatedAge', value: 'six years' })
  assert.equal(first.id, 'one:brand')
  assert.equal(followUpValue('brand', 'Uno es Philips, del otro no sé.'), 'Philips')
  assert.equal(equipment[1].brand, '')
  for (const value of ['No sé', "I don't know", 'Não sei']) assert.equal(unknownAnswer(value), true)
  assert.equal(nextFollowUp(equipment, ['one:brand']).id, 'one:estimatedAge')
  assert.equal(nextFollowUp(equipment, ['one:brand', 'one:estimatedAge']), undefined)
  assert.throws(() => followUpValue('brand', 'Philips o Siemens'))
})
