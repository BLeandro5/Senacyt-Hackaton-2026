// Isolated UI inspection. Authentication is mocked; POST/PUT never touch real data.
import { pathToFileURL } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const { chromium } = await import(pathToFileURL(process.argv[2]).href)
const browser = await chromium.launch({ executablePath: process.argv[3], headless: true })
const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion:'reduce' })
const output = '../artifacts/ui-final'
await mkdir(output, { recursive: true })
const page = await context.newPage()
const errors = [], results = []
page.on('pageerror', error => errors.push(error.message))
await context.route('http://127.0.0.1:8000/**', async route => {
  const request = route.request()
  if (request.url().endsWith('/users/login')) return route.fulfill({ json: { id:'visual-fixture', name:'Colaborador', firstName:'Colaborador', lastName:'', role:'field' } })
  if (request.url().endsWith('/observations/analyze')) return route.fulfill({ json: {
    original_text:request.postDataJSON().text, detected_language:'es',
    equipment:[{modality:'CT',manufacturer:'Philips',model:null,configuration:null,estimated_age_years:null,condition:null}],
    follow_up_candidates:[{equipment_index:0,field:'model',question:'¿Pudiste identificar el modelo del tomógrafo Philips?'}],
  } })
  if (request.url().endsWith('/visits/similar')) return route.fulfill({ json:{matches:[],highestSimilarity:0,isDuplicate:false} })
  if (!['GET', 'OPTIONS'].includes(request.method())) return route.fulfill({ status: 503, json: { detail:'Visual inspection does not write production data.' } })
  return route.continue()
})
try {
  await page.goto('http://127.0.0.1:5173/login')
  await page.getByLabel('Correo o cédula', { exact:true }).fill('visual-fixture')
  await page.getByLabel('Contraseña', { exact:true }).fill('temporary-ui-fixture')
  await page.getByRole('button', { name:'Iniciar sesión', exact:true }).click()
  await page.waitForURL('**/home')
  for (const [width,height] of process.argv.includes('--flow-only') ? [] : [[390,844],[430,932],[768,1024],[1366,900]]) {
    await page.setViewportSize({ width,height })
    for (const [name,path] of [['home','/home'],['new-visit','/visits/new'],['hospitals','/hospitals'],['customer360','/hospitals/HOSP-001'],['dashboard','/dashboard'],['analytics','/analytics'],['map','/map'],['settings','/settings']]) {
      await page.goto('http://127.0.0.1:5173'+path)
      await page.waitForLoadState('networkidle')
      const size = await page.evaluate(() => ({ width:innerWidth, scroll:document.documentElement.scrollWidth }))
      results.push({ name,width,...size, overflow:size.scroll>size.width })
      await page.screenshot({ path:`${output}/${name}-${width}.png`, fullPage:true })
    }
  }
  await page.setViewportSize({width:390,height:844})
  await page.goto('http://127.0.0.1:5173/visits/new?hospital=HOSP-001')
  await page.getByRole('button',{name:'Continuar',exact:true}).filter({visible:true}).click()
  await page.waitForURL('**/capture')
  await page.getByLabel('Texto de la observación').fill('Vi un tomógrafo Philips.')
  await page.getByRole('button',{name:'Voz local',exact:true}).click()
  await page.getByLabel('Transcripción editable').fill('Vi un tomógrafo Philips.')
  await page.screenshot({path:`${output}/voice-390.png`,fullPage:true})
  await page.getByRole('button',{name:'Chat',exact:true}).click()
  await page.getByRole('button',{name:'Analizar observación'}).click()
  await page.waitForURL('**/review')
  await page.getByText('¿Pudiste identificar el modelo del tomógrafo Philips?',{exact:false}).waitFor()
  await page.screenshot({path:`${output}/review-390.png`,fullPage:true})
  results.push({name:'review',width:390,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)})
  await page.getByLabel('Modelo',{exact:true}).fill('Incisive')
  await page.getByRole('button',{name:'Confirmar 1 equipo',exact:false}).click()
  await page.waitForURL('**/match')
  await page.waitForLoadState('networkidle')
  await page.screenshot({path:`${output}/match-390.png`,fullPage:true})
  results.push({name:'match',width:390,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)})
  await writeFile(`${output}/report.json`, JSON.stringify({ results,errors }, null,2))
  assert.deepEqual(errors, [])
  assert.equal(results.filter(result=>result.overflow).length, 0, JSON.stringify(results.filter(result=>result.overflow)))
  console.log(JSON.stringify({ pages:results.length, errors, horizontalOverflow:0 }))
} finally { await context.close(); await browser.close() }
