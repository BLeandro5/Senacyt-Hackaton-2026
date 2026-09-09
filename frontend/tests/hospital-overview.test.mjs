import test from 'node:test'
import assert from 'node:assert/strict'
import { filterHospitalEquipment } from '../src/data/hospitalOverview.ts'

const rows = [
  { id: '1', visitId: 'a', type: 'Resonador', brand: 'Siemens', model: 'Magnetom', area: 'Radiología', status: 'Operativo' },
  { id: '1', visitId: 'b', type: 'Resonador', brand: 'Siemens', model: 'Magnetom', area: 'Urgencias', status: 'Desconocido' },
  { id: '2', visitId: 'a', type: 'Tomógrafo', brand: 'GE', model: '', area: 'Radiología', status: '' },
]
test('hospital filters preserve records from separate visits and combine criteria', () => {
  assert.equal(filterHospitalEquipment(rows, '', '', '').length, 3)
  assert.equal(filterHospitalEquipment(rows, 'SIEMENS', '', '').length, 2)
  assert.deepEqual(filterHospitalEquipment(rows, 'radiologia', 'Radiología', 'Resonador'), [rows[0]])
  assert.deepEqual(filterHospitalEquipment(rows, 'missing', '', ''), [])
  assert.deepEqual(filterHospitalEquipment([], '', '', ''), [])
})
