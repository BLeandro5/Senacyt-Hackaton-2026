/* Train a local QVAC LoRA adapter; never replaces the base GGUF. */
import { access, appendFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finetune, loadModel, unloadModel } from '@qvac/sdk'
import { finetuneModelPath, verifyFinetuneModel } from './finetune-model.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// The automatic review is deliberately conservative. Override this only with
// another reviewed dataset, never with the source draft by accident.
const datasetRoot = path.resolve(root, process.env.QVAC_TRAINING_DATASET || 'backend/training/aegis_v1_v2_reviewed')
const outputRoot = path.resolve(root, process.env.QVAC_LORA_OUTPUT || 'artifacts/medpsy-aegis-v1-v2-lora')
const train = path.join(datasetRoot, 'train_chat.jsonl')
const validation = path.join(datasetRoot, 'validation_chat.jsonl')
const trainRaw = path.join(datasetRoot, 'train_raw.jsonl')
const validationRaw = path.join(datasetRoot, 'validation_raw.jsonl')
const allowDraft = process.argv.includes('--allow-draft')
const run = process.argv.includes('--run')

async function exists(target) { try { await access(target); return true } catch { return false } }
function fail(message) { console.error(`Preflight failed: ${message}`); process.exitCode = 1 }
async function readRows(target) {
  const { readFile } = await import('node:fs/promises')
  return (await readFile(target, 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse)
}

const required = [train, validation, trainRaw, validationRaw]
for (const target of required) if (!await exists(target)) fail(`missing ${target}`)
if (process.exitCode) process.exit()
const trainRows = await readRows(train)
const validationRows = await readRows(validation)
const reviewRows = [...await readRows(trainRaw), ...await readRows(validationRaw)]
const drafts = reviewRows.filter(row => row.metadata?.review_status !== 'approved')
if (!trainRows.length || !validationRows.length) fail('training and validation must not be empty')
if (trainRows.length !== reviewRows.filter(row => row.metadata.split === 'train').length || validationRows.length !== reviewRows.filter(row => row.metadata.split === 'validation').length) fail('chat and reviewed raw split sizes differ')
const overview = { baseModel: 'MedPsy-1.7B Q8_0', baseModelPath: finetuneModelPath, trainExamples: trainRows.length,
  validationExamples: validationRows.length, unapprovedExamples: drafts.length, outputRoot,
  mode: 'LoRA (QVAC native; not QLoRA)', runRequested: run,
  baseModelPresent: await exists(finetuneModelPath),
  automaticallyReviewedExamples: reviewRows.filter(row => row.metadata?.human_reviewed === false).length }
console.log(JSON.stringify(overview, null, 2))
if (drafts.length && !allowDraft) fail('dataset contains draft labels; review and approve them, or explicitly use --allow-draft for an experimental adapter')
if (!run) process.exit(process.exitCode || 0)
if (process.exitCode) process.exit()

await verifyFinetuneModel()
if (await exists(outputRoot)) throw new Error('Training output already exists; set QVAC_LORA_OUTPUT to a new directory')
await mkdir(outputRoot, { recursive: true })
await mkdir(path.join(outputRoot, 'checkpoints'), { recursive: true })
const manifest = { ...overview, startedAt: new Date().toISOString(), assistantLossOnly: true,
  // QVAC uses token counts here, not numbers of training examples.
  epochs: 3, learningRate: 0.0001, contextLength: 2048, batchSize: 128, microBatchSize: 128,
  loraRank: 8, loraAlpha: 16, loraModules: 'attn_q,attn_k,attn_v,attn_o,ffn_gate,ffn_up,ffn_down' }
await writeFile(path.join(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
let modelId
try {
  modelId = await loadModel({ modelSrc: finetuneModelPath, modelType: 'llamacpp-completion', modelConfig: { device: 'gpu', ctx_size: manifest.contextLength } })
  const handle = finetune({ modelId, options: {
    trainDatasetDir: train, validation: { type: 'dataset', path: validation }, outputParametersDir: outputRoot,
    numberOfEpochs: manifest.epochs, learningRate: manifest.learningRate, lrMin: 1e-6,
    contextLength: manifest.contextLength, batchSize: manifest.batchSize, microBatchSize: manifest.microBatchSize,
    assistantLossOnly: true, loraModules: manifest.loraModules, loraRank: 8, loraAlpha: 16, loraSeed: 42,
    checkpointSaveDir: path.join(outputRoot, 'checkpoints'), checkpointSaveSteps: 25,
    lrScheduler: 'cosine', warmupRatio: 0.05, warmupRatioSet: true,
  } })
  for await (const tick of handle.progressStream) {
    await appendFile(path.join(outputRoot, 'progress.jsonl'), JSON.stringify(tick) + '\n')
    console.log(JSON.stringify({ type: 'progress', ...tick }))
  }
  const result = await handle.result
  await writeFile(path.join(outputRoot, 'result.json'), JSON.stringify(result, null, 2) + '\n')
  if (result.status !== 'COMPLETED') throw new Error(`LoRA did not complete: ${result.status}`)
  console.log(JSON.stringify({ type: 'completed', result }))
} catch (error) {
  await writeFile(path.join(outputRoot, 'error.json'), JSON.stringify({ error: String(error), failedAt: new Date().toISOString() }, null, 2) + '\n')
  throw error
} finally {
  if (modelId) await unloadModel({ modelId, clearStorage: false })
}
