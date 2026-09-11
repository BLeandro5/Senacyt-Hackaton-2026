import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export const finetuneModel = {
  filename: 'medpsy-1.7b-q8_0.gguf',
  expectedSize: 2165039040,
  sha256: '03ebb130aa6e818a8cf733301381c9edb69c94e0e1ad556595b1d5545a1c5073',
  url: 'https://huggingface.co/qvac/MedPsy-1.7B-GGUF/resolve/fd4cecc90c2de8dce4b112795456a54be9c59363/medpsy-1.7b-q8_0.gguf',
}
export const finetuneModelPath = path.resolve('models', finetuneModel.filename)

export async function verifyFinetuneModel(target = finetuneModelPath) {
  const info = await stat(target)
  if (info.size !== finetuneModel.expectedSize) throw new Error(`Unexpected model size: ${info.size}`)
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(target)) hash.update(chunk)
  if (hash.digest('hex') !== finetuneModel.sha256) throw new Error('Model SHA-256 mismatch')
  return target
}

export async function downloadFinetuneModel() {
  try { return await verifyFinetuneModel() }
  catch { /* A missing or incomplete file is replaced only after verified download. */ }
  const partial = finetuneModelPath + '.download'
  await mkdir(path.dirname(finetuneModelPath), { recursive: true })
  const existing = await stat(partial).then(info => info.size).catch(() => 0)
  if (existing > finetuneModel.expectedSize) throw new Error('Partial download is larger than the expected model')
  console.log(JSON.stringify({ event: existing ? 'download_resume' : 'download_start', bytes: finetuneModel.expectedSize, existing }))
  const response = await fetch(finetuneModel.url, existing ? { headers: { Range: `bytes=${existing}-` } } : undefined)
  if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`)
  if (existing && response.status !== 206) throw new Error(`Server did not honor resume request: HTTP ${response.status}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial, { flags: existing ? 'a' : 'w' }))
  await verifyFinetuneModel(partial)
  await rename(partial, finetuneModelPath)
  return finetuneModelPath
}
