export type UserLanguage = 'es' | 'en' | 'pt'

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const markers: Record<UserLanguage, string[]> = {
  es: ['hay', 'veo', 'tiene', 'tienen', 'equipo', 'anos', 'marca', 'modelo', 'resonador'],
  en: ['there', 'have', 'has', 'equipment', 'years', 'manufacturer', 'model', 'unknown', 'system'],
  pt: ['ha', 'tem', 'equipamento', 'anos', 'marca', 'modelo', 'ressonancia', 'desconhecido'],
}

export function detectUserLanguage(text: string): UserLanguage {
  const words = new Set(normalize(text).match(/\b\w+\b/g) || [])
  const scores = Object.fromEntries(Object.entries(markers).map(([language, values]) => [language, values.filter(word => words.has(word)).length])) as Record<UserLanguage, number>
  const highest = Math.max(...Object.values(scores))
  const winners = (Object.keys(scores) as UserLanguage[]).filter(language => scores[language] === highest)
  return highest && winners.length === 1 ? winners[0] : 'es'
}

export const assistantCopy: Record<UserLanguage, { prompt: string; analyzing: string; note: string; save: string; skip: string; skipAll: string }> = {
  es: { prompt: 'Cuéntame qué equipo ves. Si conoces la marca, modelo, antigüedad o estado, inclúyelos.', analyzing: 'Analizando con MedPsy local...', note: 'La respuesta se aplica solamente a este equipo. Puedes corregir los demás en sus tarjetas.', save: 'Guardar respuesta', skip: 'No lo sé / Omitir', skipAll: 'Omitir todas las preguntas' },
  en: { prompt: 'Tell me which equipment you see. Include the manufacturer, model, age, or condition if you know them.', analyzing: 'Analyzing with local MedPsy...', note: 'Your answer applies only to this equipment. You can correct the other equipment in its cards.', save: 'Save answer', skip: "I don't know / Skip", skipAll: 'Skip all questions' },
  pt: { prompt: 'Conte qual equipamento você vê. Inclua marca, modelo, idade ou estado se souber.', analyzing: 'Analisando com MedPsy local...', note: 'A resposta se aplica somente a este equipamento. Você pode corrigir os demais nos cartões.', save: 'Salvar resposta', skip: 'Não sei / Pular', skipAll: 'Pular todas as perguntas' },
}

export const fieldLabel: Record<UserLanguage, Record<string, string>> = {
  es: { brand: 'marca', estimatedAge: 'edad aproximada', model: 'modelo', configuration: 'configuración', status: 'estado' },
  en: { brand: 'manufacturer', estimatedAge: 'approximate age', model: 'model', configuration: 'configuration', status: 'condition' },
  pt: { brand: 'marca', estimatedAge: 'idade aproximada', model: 'modelo', configuration: 'configuração', status: 'estado' },
}
