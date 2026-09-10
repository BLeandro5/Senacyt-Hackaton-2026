export const reviewCopy = {
  es: {
    fields: { modality: 'Tipo', manufacturer: 'Marca', model: 'Modelo', configuration: 'Configuración', age: 'Edad', condition: 'Estado' },
    statuses: { Confirmed: 'Confirmado', Reported: 'Reportado', Estimated: 'Estimado', Unknown: 'Desconocido' },
    found: 'Equipos encontrados', detected: (count: number) => `La IA detectó ${count} ${count === 1 ? 'equipo' : 'equipos'}`,
  },
  en: {
    fields: { modality: 'Type', manufacturer: 'Manufacturer', model: 'Model', configuration: 'Configuration', age: 'Age', condition: 'Condition' },
    statuses: { Confirmed: 'Confirmed', Reported: 'Reported', Estimated: 'Estimated', Unknown: 'Unknown' },
    found: 'Equipment found', detected: (count: number) => `AI detected ${count} ${count === 1 ? 'device' : 'devices'}`,
  },
  pt: {
    fields: { modality: 'Tipo', manufacturer: 'Marca', model: 'Modelo', configuration: 'Configuração', age: 'Idade', condition: 'Estado' },
    statuses: { Confirmed: 'Confirmado', Reported: 'Relatado', Estimated: 'Estimado', Unknown: 'Desconhecido' },
    found: 'Equipamentos encontrados', detected: (count: number) => `A IA detectou ${count} ${count === 1 ? 'equipamento' : 'equipamentos'}`,
  },
}

export function currentReviewCopy() {
  let language = 'es'
  try { language = localStorage.getItem('language') || 'es' } catch { /* Default language. */ }
  return reviewCopy[language === 'en' || language === 'pt' ? language : 'es']
}
