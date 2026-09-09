import { readStored, type Visit } from './visitStore'

export const demoVisits: Visit[] = [
  {
    id: 'VIS-001',
    hospital: 'Hospital Santo Tomás',
    area: 'Imagenología',
    region: 'Panamá Metro',
    date: '9 sep 2026',
    startedAt: '9:42 a. m.',
    completedAt: '10:06 a. m.',
    syncStatus: 'synced',
    observations: [
      {
        id: 'OBS-001',
        captureMode: 'voice',
        originalText:
          'Tienen dos resonadores y un tomógrafo. Uno de los resonadores parece de unos ocho años.',
        equipment: [
          {
            id: 'EQ-OBS-001',
            type: 'Resonador magnético',
            brand: 'Philips',
            model: 'Ingenia',
            configuration: '1.5T',
            estimatedAge: '8 años',
            status: 'Operativo',
            resolution: 'existing',
            matchedEquipmentId: 'EQ-00421',
          },
          {
            id: 'EQ-OBS-002',
            type: 'Resonador magnético',
            brand: 'Desconocida',
            model: 'Desconocido',
            estimatedAge: 'Desconocida',
            status: 'No informado',
            resolution: 'new',
          },
          {
            id: 'EQ-OBS-003',
            type: 'Tomógrafo',
            brand: 'Siemens',
            model: 'Somatom',
            configuration: '64 cortes',
            estimatedAge: 'Desconocida',
            status: 'Operativo',
            resolution: 'existing',
            matchedEquipmentId: 'EQ-00128',
          },
        ],
      },
    ],
  },
  {
    id: 'VIS-002',
    hospital: 'Hospital Nacional',
    area: 'Radiología',
    region: 'Panamá Metro',
    date: '8 sep 2026',
    startedAt: '3:18 p. m.',
    completedAt: '3:51 p. m.',
    syncStatus: 'synced',
    observations: [
      {
        id: 'OBS-002',
        captureMode: 'chat',
        originalText:
          'En radiología hay un tomógrafo de 64 cortes que se encuentra operativo.',
        equipment: [
          {
            id: 'EQ-OBS-004',
            type: 'Tomógrafo',
            brand: 'Siemens',
            model: 'Somatom',
            configuration: '64 cortes',
            status: 'Operativo',
            resolution: 'existing',
            matchedEquipmentId: 'EQ-00311',
          },
        ],
      },
      {
        id: 'OBS-003',
        captureMode: 'voice',
        originalText:
          'También observé dos equipos de ultrasonido, uno de ellos portátil.',
        equipment: [
          {
            id: 'EQ-OBS-005',
            type: 'Ultrasonido',
            brand: 'GE',
            model: 'LOGIQ',
            configuration: 'Portátil',
            status: 'En uso',
            resolution: 'new',
          },
          {
            id: 'EQ-OBS-006',
            type: 'Ultrasonido',
            brand: 'Desconocida',
            model: 'Desconocido',
            status: 'No informado',
            resolution: 'new',
          },
        ],
      },
    ],
  },
  {
    id: 'VIS-003',
    hospital: 'Hospital Punta Pacífica',
    area: 'Urgencias',
    region: 'Panamá Metro',
    date: '8 sep 2026',
    startedAt: '11:05 a. m.',
    completedAt: '11:24 a. m.',
    syncStatus: 'pending',
    observations: [
      {
        id: 'OBS-004',
        captureMode: 'voice',
        originalText:
          'Hay un equipo de rayos X móvil y un ultrasonido en el área de urgencias.',
        equipment: [
          {
            id: 'EQ-OBS-007',
            type: 'Rayos X móvil',
            brand: 'Philips',
            model: 'Desconocido',
            status: 'Operativo',
            resolution: 'existing',
            matchedEquipmentId: 'EQ-00540',
          },
          {
            id: 'EQ-OBS-008',
            type: 'Ultrasonido',
            brand: 'Desconocida',
            model: 'Desconocido',
            status: 'No informado',
            resolution: 'new',
          },
        ],
      },
    ],
  },
]

export function getVisits(includeExamples = true): Visit[] {
  const local = readStored<Visit[]>('completed-visits', [])
  return [...local, ...(includeExamples ? demoVisits.filter(v => !local.some(item => item.id === v.id)) : [])]
}
