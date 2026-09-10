/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'

export type UiLanguage = 'es' | 'en' | 'pt'

const LANGUAGE_EVENT = 'installed-base-language-change'

export function getUiLanguage(): UiLanguage {
  try {
    const language = localStorage.getItem('language')
    return language === 'en' || language === 'pt' ? language : 'es'
  } catch { return 'es' }
}

export function setUiLanguage(language: UiLanguage) {
  localStorage.setItem('language', language)
  window.dispatchEvent(new Event(LANGUAGE_EVENT))
}

export function useUiLanguage() {
  const [language, setLanguage] = useState<UiLanguage>(getUiLanguage)
  useEffect(() => {
    const update = () => setLanguage(getUiLanguage())
    window.addEventListener(LANGUAGE_EVENT, update)
    return () => window.removeEventListener(LANGUAGE_EVENT, update)
  }, [])
  return { language, changeLanguage: setUiLanguage }
}

type Translation = [es: string, en: string, pt: string]

// UI copy only. Clinical notes, hospital names and user-entered text are never
// translated or altered by this bridge.
const copy: Translation[] = [
  ['Inicio', 'Home', 'Início'], ['Mis visitas', 'My visits', 'Minhas visitas'], ['Nueva visita', 'New visit', 'Nova visita'],
  ['Mapa', 'Map', 'Mapa'], ['Mapa / geografía', 'Map / geography', 'Mapa / geografia'], ['Hospitales / Customer 360', 'Hospitals / Customer 360', 'Hospitais / Customer 360'],
  ['Por revisar', 'To review', 'Para revisar'], ['Oportunidades', 'Opportunities', 'Oportunidades'], ['Configuración', 'Settings', 'Configurações'],
  ['Navegación principal', 'Main navigation', 'Navegação principal'], ['Navegación móvil', 'Mobile navigation', 'Navegação móvel'],
  ['Inteligencia de inventario', 'Inventory intelligence', 'Inteligência de inventário'], ['Saltar al contenido', 'Skip to content', 'Ir para o conteúdo'],
  ['En línea', 'Online', 'Online'], ['Sin conexión', 'Offline', 'Sem conexão'], ['Cerrar sesión', 'Log out', 'Sair'],
  ['Sin Internet. Puedes usar MedPsy y SQLite localmente si sus servicios siguen iniciados.', 'No Internet. You can use MedPsy and SQLite locally while their services are running.', 'Sem Internet. Você pode usar MedPsy e SQLite localmente enquanto os serviços estiverem em execução.'],
  ['No pudimos abrir esta pantalla', 'We could not open this page', 'Não foi possível abrir esta tela'], ['Volver al inicio', 'Return home', 'Voltar ao início'],
  ['Los datos guardados no se han eliminado. Vuelve al inicio e intenta continuar la visita.', 'Saved data was not deleted. Return home and try to continue the visit.', 'Os dados salvos não foram excluídos. Volte ao início e tente continuar a visita.'],
  ['Guardar borrador y volver al inicio', 'Save draft and return home', 'Salvar rascunho e voltar ao início'], ['Analizar', 'Analyze', 'Analisar'],
  ['Analizando con MedPsy local...', 'Analyzing with local MedPsy...', 'Analisando com MedPsy local...'], ['Analizando con MedPsy…', 'Analyzing with MedPsy…', 'Analisando com MedPsy…'],
  ['Texto de la observación', 'Observation text', 'Texto da observação'], ['Transcripción editable', 'Editable transcript', 'Transcrição editável'],
  ['Captura', 'Capture', 'Captura'], ['Capturar observación', 'Capture observation', 'Capturar observação'], ['¿Qué estás observando?', 'What are you observing?', 'O que você está observando?'],
  ['Describe uno o varios equipos de forma natural por escrito. También puedes dictar usando transcripción local y revisar el texto.', 'Describe one or more devices naturally in writing. You can also dictate with local transcription and review the text.', 'Descreva um ou mais equipamentos naturalmente por escrito. Você também pode ditar com transcrição local e revisar o texto.'],
  ['Voz local', 'Local voice', 'Voz local'], ['Autocompletar', 'Autocomplete', 'Autocompletar'], ['Agregar fotografía', 'Add photo', 'Adicionar foto'],
  ['Opcional · equipo, etiqueta o placa', 'Optional · device, label, or plate', 'Opcional · equipamento, etiqueta ou placa'], ['Fotografía agregada', 'Photo added', 'Foto adicionada'],
  ['Analizar observación', 'Analyze observation', 'Analisar observação'], ['Observación original', 'Original observation', 'Observação original'],
  ['Confiabilidad preliminar activa', 'Preliminary reliability active', 'Confiabilidade preliminar ativa'], ['Agregar', 'Add', 'Adicionar'],
  ['No hay equipos para confirmar.', 'There is no equipment to confirm.', 'Não há equipamentos para confirmar.'], ['Agregar equipo manualmente', 'Add equipment manually', 'Adicionar equipamento manualmente'],
  ['La IA no completa lo que no sabe', 'AI does not fill in what it does not know', 'A IA não completa o que não sabe'], ['Confirmar coincidencias', 'Confirm matches', 'Confirmar correspondências'],
  ['Volver a la observación', 'Back to observation', 'Voltar à observação'], ['Posible coincidencia', 'Possible match', 'Possível correspondência'],
  ['Es el mismo equipo', 'It is the same equipment', 'É o mesmo equipamento'], ['Es diferente / nuevo', 'It is different / new', 'É diferente / novo'],
  ['Guardar como pendiente de verificación', 'Save as pending verification', 'Salvar como pendente de verificação'], ['Reintentar conexión', 'Retry connection', 'Tentar conexão novamente'],
  ['Captura rápida', 'Quick capture', 'Captura rápida'], ['Ocultar observaciones generales', 'Hide general observations', 'Ocultar observações gerais'], ['Ver observaciones generales', 'View general observations', 'Ver observações gerais'],
  ['Buen día', 'Good day', 'Bom dia'], ['¿Listo para tu próxima visita?', 'Ready for your next visit?', 'Pronto para sua próxima visita?'], ['Captura inteligente', 'Smart capture', 'Captura inteligente'],
  ['Selecciona un hospital y registra lo que observas.', 'Select a hospital and record what you observe.', 'Selecione um hospital e registre o que observa.'], ['Resumen de hoy', 'Today’s summary', 'Resumo de hoje'],
  ['Equipos', 'Equipment', 'Equipamentos'], ['Pendientes', 'Pending', 'Pendentes'], ['Visitas recientes', 'Recent visits', 'Visitas recentes'], ['Actividad reciente', 'Recent activity', 'Atividade recente'],
  ['Ver todas', 'View all', 'Ver todas'], ['Continuar visita', 'Continue visit', 'Continuar visita'], ['Tienes una visita en progreso', 'You have a visit in progress', 'Você tem uma visita em andamento'],
  ['No tienes visitas pendientes', 'You have no pending visits', 'Você não tem visitas pendentes'], ['Área no especificada', 'Area not specified', 'Área não especificada'], ['Descartar borrador', 'Discard draft', 'Descartar rascunho'],
  ['Quitar fotografía', 'Remove photo', 'Remover foto'], ['Volver a la revisión', 'Back to review', 'Voltar à revisão'],
  ['Equipo observado', 'Observed equipment', 'Equipamento observado'], ['Tipo de equipo', 'Equipment type', 'Tipo de equipamento'],
  ['Marca', 'Manufacturer', 'Fabricante'], ['Modelo', 'Model', 'Modelo'], ['Configuración', 'Configuration', 'Configuração'],
  ['Antigüedad estimada', 'Estimated age', 'Idade estimada'], ['Antigüedad aprox.', 'Approx. age', 'Idade aprox.'], ['Estado', 'Condition', 'Estado'],
  ['Desconocido', 'Unknown', 'Desconhecido'], ['No especificado', 'Not specified', 'Não especificado'], ['No especificada', 'Not specified', 'Não especificada'],
  ['No informado', 'Not reported', 'Não informado'], ['No informada', 'Not reported', 'Não informada'], ['Marca desconocida', 'Unknown manufacturer', 'Fabricante desconhecido'],
  ['Modelo desconocido', 'Unknown model', 'Modelo desconhecido'], ['Edad desconocida', 'Unknown age', 'Idade desconhecida'],
  ['Confirmado', 'Confirmed', 'Confirmado'], ['Reportado', 'Reported', 'Relatado'], ['Estimado', 'Estimated', 'Estimado'],
  ['Pendiente', 'Pending', 'Pendente'], ['Guardada', 'Saved', 'Salva'], ['Actualizar', 'Refresh', 'Atualizar'], ['Cargando...', 'Loading...', 'Carregando...'],
  ['Dashboard', 'Dashboard', 'Painel'], ['Resumen de las visitas finalizadas y guardadas.', 'Summary of completed and saved visits.', 'Resumo das visitas concluídas e salvas.'],
  ['Ver oportunidades', 'View opportunities', 'Ver oportunidades'], ['Información por revisar', 'Information to review', 'Informações para revisar'], ['Explorar geografía', 'Explore geography', 'Explorar geografia'],
  ['Aún no hay visitas finalizadas', 'There are no completed visits yet', 'Ainda não há visitas concluídas'], ['Finaliza una visita para incluirla en estos totales.', 'Complete a visit to include it in these totals.', 'Conclua uma visita para incluí-la nestes totais.'],
  ['Totales por hospital', 'Totals by hospital', 'Totais por hospital'], ['Registros de equipos', 'Equipment records', 'Registros de equipamentos'], ['Visitas', 'Visits', 'Visitas'],
  ['Sin activos consolidados.', 'No consolidated assets.', 'Sem ativos consolidados.'], ['Confiabilidad', 'Reliability', 'Confiabilidade'], ['Actualizado', 'Updated', 'Atualizado'],
  ['Nueva observación', 'New observation', 'Nova observação'], ['Panorama de equipos conocido', 'Known equipment landscape', 'Panorama conhecido de equipamentos'],
  ['Customer 360 · SQLite local', 'Customer 360 · local SQLite', 'Customer 360 · SQLite local'], ['Equipos canónicos', 'Canonical equipment', 'Equipamentos canônicos'],
  ['Visitas finalizadas', 'Completed visits', 'Visitas concluídas'], ['Observaciones', 'Observations', 'Observações'], ['Última actualización', 'Last updated', 'Última atualização'],
  ['Panorama conocido de equipos', 'Known equipment landscape', 'Panorama conhecido de equipamentos'],
  ['Solo incluye activos canónicos que una persona decidió conservar en la base instalada.', 'Includes only canonical assets that a person chose to retain in the installed base.', 'Inclui somente ativos canônicos que uma pessoa decidiu manter na base instalada.'],
  ['Aún no hay equipos canónicos. Revisa una observación y decide si cada equipo es nuevo o coincide con uno existente.', 'There is no canonical equipment yet. Review an observation and decide whether each item is new or matches an existing one.', 'Ainda não há equipamentos canônicos. Revise uma observação e decida se cada item é novo ou corresponde a um existente.'],
  ['Observaciones del hospital', 'Hospital observations', 'Observações do hospital'], ['Área', 'Area', 'Área'], ['Cantidad', 'Quantity', 'Quantidade'],
  ['Mapa de base instalada', 'Installed-base map', 'Mapa da base instalada'], ['País', 'Country', 'País'], ['Provincia', 'Province', 'Província'], ['Ciudad', 'City', 'Cidade'],
  ['Todos los países', 'All countries', 'Todos os países'], ['Todas las provincias', 'All provinces', 'Todas as províncias'], ['Todas las ciudades', 'All cities', 'Todas as cidades'],
  ['Buscar hospital', 'Search hospital', 'Buscar hospital'], ['Nombre o dependencia', 'Name or affiliation', 'Nome ou vínculo'], ['Ver observaciones', 'View observations', 'Ver observações'], ['Observar', 'Observe', 'Observar'],
  ['No hay hospitales que coincidan con estos filtros.', 'No hospitals match these filters.', 'Nenhum hospital corresponde a estes filtros.'],
  ['Captura rápida', 'Quick capture', 'Captura rápida'], ['Nota original', 'Original note', 'Nota original'], ['Selecciona hospital', 'Select hospital', 'Selecione um hospital'],
  ['Confirmar hospital y revisar equipos', 'Confirm hospital and review equipment', 'Confirmar hospital e revisar equipamentos'], ['Editar nota', 'Edit note', 'Editar nota'],
  ['Iniciar sesión', 'Sign in', 'Entrar'], ['Crear cuenta', 'Create account', 'Criar conta'], ['Crea tu cuenta', 'Create your account', 'Crie sua conta'],
  ['Nombre', 'First name', 'Nome'], ['Apellido', 'Last name', 'Sobrenome'], ['Correo electrónico', 'Email', 'E-mail'], ['Celular', 'Mobile phone', 'Celular'], ['Contraseña', 'Password', 'Senha'], ['Mostrar contraseña', 'Show password', 'Mostrar senha'],
  ['Buscar', 'Search', 'Buscar'], ['Reintentar', 'Retry', 'Tentar novamente'], ['Guardar', 'Save', 'Salvar'], ['Cancelar', 'Cancel', 'Cancelar'],
  ['Sí', 'Yes', 'Sim'], ['No', 'No', 'Não'], ['Exacta', 'Exact', 'Exata'], ['Aproximada', 'Approximate', 'Aproximada'], ['No sé', "I don't know", 'Não sei'],
  ['Modo local', 'Local mode', 'Modo local'], ['Disponible', 'Available', 'Available'], ['No disponible', 'Unavailable', 'Indisponível'], ['Consultando', 'Checking', 'Consultando'],
  ['Base instalada · SQLite local', 'Installed base · local SQLite', 'Base instalada · SQLite local'], ['Consultar inventario con MedPsy local', 'Query inventory with local MedPsy', 'Consultar inventário com MedPsy local'],
  ['Equipos CT Philips con más de 7 años', 'Philips CT equipment older than 7 years', 'Equipamentos CT Philips com mais de 7 anos'], ['Consultar', 'Query', 'Consultar'],
  ['Activos canónicos', 'Canonical assets', 'Ativos canônicos'], ['Evidencias', 'Evidence', 'Evidências'], ['Conflictos', 'Conflicts', 'Conflitos'], ['Posibles renovaciones >7 años', 'Possible refreshes >7 years', 'Possíveis renovações >7 anos'],
  ['Hospitales y evidencias pendientes', 'Hospitals and pending evidence', 'Hospitais e evidências pendentes'], ['Motivo: hospital sin confirmar.', 'Reason: hospital is not confirmed.', 'Motivo: hospital não confirmado.'],
  ['Confirmar hospital', 'Confirm hospital', 'Confirmar hospital'], ['Mantener en verificación', 'Keep under verification', 'Manter em verificação'], ['Reported', 'Reported', 'Relatado'],
  ['País → provincia → ciudad → hospital → equipos registrados.', 'Country → province → city → hospital → recorded equipment.', 'País → província → cidade → hospital → equipamentos registrados.'],
  ['Ver actividad y totales por geografía', 'View activity and totals by geography', 'Ver atividade e totais por geografia'],
  ['Base geográfica de Panamá incluida localmente. Funciona sin red; algunas coordenadas corresponden al centro de la ciudad. Los puntos agrupados permiten seleccionar cada hospital.', 'Panama geographic base included locally. It works offline; some coordinates refer to a city centre. Grouped points let you select each hospital.', 'Base geográfica do Panamá incluída localmente. Funciona sem internet; algumas coordenadas correspondem ao centro da cidade. Os pontos agrupados permitem selecionar cada hospital.'],
  ['Modalidad', 'Modality', 'Modalidade'], ['Frescura', 'Freshness', 'Atualidade'], ['Antigüedad', 'Age', 'Idade'], ['Reliability', 'Reliability', 'Confiabilidade'], ['Low', 'Low', 'Baixa'], ['Medium', 'Medium', 'Média'], ['High', 'High', 'Alta'],
  ['Installed base · local signals', 'Installed base · local signals', 'Base instalada · sinais locais'], ['Refresh opportunities', 'Refresh opportunities', 'Oportunidades de renovação'],
  ['These are inventory signals based on stated age and data freshness. They are not clinical or purchasing recommendations.', 'These are inventory signals based on stated age and data freshness. They are not clinical or purchasing recommendations.', 'Estes são sinais de inventário baseados na idade informada e na atualidade dos dados. Não são recomendações clínicas ou de compra.'],
  ['Age:', 'Age:', 'Idade:'], ['Freshness:', 'Freshness:', 'Atualidade:'], ['Review the supporting evidence before acting on this signal.', 'Review the supporting evidence before acting on this signal.', 'Revise as evidências antes de agir com base neste sinal.'],
  ['Open asset evidence', 'Open asset evidence', 'Abrir evidências do ativo'], ['No refresh signals are currently available.', 'No refresh signals are currently available.', 'Não há sinais de renovação disponíveis no momento.'],
  ['Internet no requerido', 'Internet not required', 'Internet não necessária'], ['Estado local', 'Local status', 'Status local'], ['Apariencia', 'Appearance', 'Aparência'], ['Claro', 'Light', 'Claro'], ['Oscuro', 'Dark', 'Escuro'], ['Sistema', 'System', 'Sistema'],
]

const translations = new Map(copy.flatMap(row => row.map(value => [value, row] as const)))
const originalText = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Map<string, string>>()
const attributes = ['aria-label', 'placeholder', 'title']

function translated(value: string, language: UiLanguage) {
  const row = translations.get(value.trim())
  if (!row) return value
  const whitespace = value.match(/^\s*/)?.[0] || ''
  const trailing = value.match(/\s*$/)?.[0] || ''
  return `${whitespace}${row[language === 'es' ? 0 : language === 'en' ? 1 : 2]}${trailing}`
}

function applyTranslations(root: Node, language: UiLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
  for (const node of textNodes) {
    if (!node.parentElement || node.parentElement.closest('[data-ui-localized]') || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.parentElement.tagName)) continue
    const source = originalText.get(node) ?? node.data
    originalText.set(node, source)
    const value = translated(source, language)
    if (node.data !== value) node.data = value
  }
  const elements = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...document.querySelectorAll('*')]
  for (const element of elements) {
    if (element.closest('[data-ui-localized]')) continue
    for (const attribute of attributes) {
      const current = element.getAttribute(attribute)
      if (!current) continue
      const saved = originalAttributes.get(element) ?? new Map<string, string>()
      if (!originalAttributes.has(element)) originalAttributes.set(element, saved)
      const source = saved.get(attribute) ?? current
      saved.set(attribute, source)
      const value = translated(source, language)
      if (current !== value) element.setAttribute(attribute, value)
    }
  }
}

export function UiLanguageBridge() {
  const { language } = useUiLanguage()
  useEffect(() => {
    document.documentElement.lang = language
    applyTranslations(document.body, language)
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) applyTranslations(node, language)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language])
  return null
}
