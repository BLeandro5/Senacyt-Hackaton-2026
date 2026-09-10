import http from 'node:http'
import { performance } from 'node:perf_hooks'
import { loadModel, completion, unloadModel, close } from '@qvac/sdk'
import { descriptor, modelName, quantization, verifyModel } from './model.mjs'

// Use the installed weights. Starting the service never downloads a model.
const modelPath = await verifyModel().catch(error => {
  throw new Error(`Run npm run qvac:download first. ${error.message}`)
})

const started = performance.now()
const modelId = await loadModel({
  modelSrc: modelPath,
  modelType: 'llamacpp-completion',
  modelConfig: { ctx_size: 4096, temp: 0, predict: 1024, reasoning_budget: 0 },
})
const modelLoadMs = performance.now() - started
let busy = false

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

// Some local models finish JSON and then emit extra tokens until their limit.
// Recover only a complete object; incomplete output remains an error.
function firstJsonObject(text) {
  let start = -1
  let depth = 0
  let quoted = false
  let escaped = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') quoted = false
      continue
    }
    if (character === '"') { quoted = true; continue }
    if (character === '{') {
      if (start === -1) start = index
      depth += 1
    } else if (character === '}' && start !== -1) {
      depth -= 1
      if (depth === 0) {
        const candidate = text.slice(start, index + 1)
        try {
          const value = JSON.parse(candidate)
          if (value && typeof value === 'object' && !Array.isArray(value)) return candidate
        } catch { /* Keep scanning in case this object was malformed. */ }
        start = -1
      }
    }
  }
  return null
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: busy ? 'busy' : 'ready', model: modelName, quantization, sdk_model: descriptor.name, sha256: descriptor.sha256Checksum, model_load_ms: modelLoadMs })
  }
  if (req.method !== 'POST' || req.url !== '/generate') return send(res, 404, { error: 'Not found' })
  // Browser traffic must go through FastAPI, which owns the CORS policy.
  if (req.headers.origin) return send(res, 403, { error: 'Use the FastAPI endpoint' })
  if (busy) return send(res, 503, { error: 'Model busy; retry when the current analysis finishes' })
  busy = true
  try {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > 64_000) return send(res, 413, { error: 'Request too large' })
      chunks.push(chunk)
    }
    let payload
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return send(res, 400, { error: 'Invalid JSON' }) }
    if (typeof payload?.prompt !== 'string' || !payload.prompt.trim() || payload.prompt.length > 12_000) {
      return send(res, 422, { error: 'prompt must contain 1 to 12000 characters' })
    }
    const begin = performance.now()
    let ttft = null
    const run = completion({
      modelId, history: [{ role: 'user', content: payload.prompt }], stream: true,
      generationParams: { temp: 0, seed: 42, predict: 2048, reasoning_budget: 0 },
      captureThinking: true,
    })
    // Attach rejection handling immediately; events and final share errors.
    run.final.catch(() => {})
    for await (const event of run.events) {
      if (event.type === 'contentDelta' && event.text && ttft === null) ttft = performance.now() - begin
    }
    const final = await run.final
    const recoveredJson = final.stopReason === 'length' ? firstJsonObject(final.contentText || '') : null
    if ((final.stopReason === 'length' || final.stopReason === 'cancelled') && !recoveredJson) {
      return send(res, 502, { error: 'Incomplete model output; shorten the observation' })
    }
    send(res, 200, {
      output_text: recoveredJson || final.contentText,
      metrics: {
        model: modelName, quantization, sdk_model: descriptor.name,
        sha256: descriptor.sha256Checksum, reasoning_budget: 0, model_load_ms: modelLoadMs,
        total_ms: performance.now() - begin, ttft_ms: ttft,
        prompt_tokens: final.stats?.promptTokens ?? null,
        generated_tokens: final.stats?.generatedTokens ?? null,
        tokens_per_second: final.stats?.tokensPerSecond ?? null,
        backend_device: final.stats?.backendDevice ?? null,
      },
    })
  } catch (error) {
    console.error('Local inference failed:', error.message)
    if (!res.headersSent) send(res, 502, { error: 'Local inference failed' })
  } finally {
    busy = false
  }
})
server.requestTimeout = 200_000
server.listen(11500, '127.0.0.1', () => console.log(`QVAC SDK ready: ${modelName} at http://127.0.0.1:11500`))
async function shutdown() {
  server.close()
  await unloadModel({ modelId })
  await close()
  process.exit(0)
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
