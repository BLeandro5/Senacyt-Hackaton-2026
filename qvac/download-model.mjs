import { mkdir, rename } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { close } from '@qvac/sdk'
import { modelPath, downloadUrl, verifyModel } from './model.mjs'

try {
  await verifyModel()
  console.log('Official MedPsy weights already installed and verified.')
} catch {
  const partial = `${modelPath}.download`
  await mkdir(path.dirname(modelPath), { recursive: true })
  console.log(`Downloading official MedPsy weights from ${downloadUrl}`)
  const response = await fetch(downloadUrl)
  if (!response.ok || !response.body) throw new Error(`Model download failed: HTTP ${response.status}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial))
  await verifyModel(partial)
  await rename(partial, modelPath)
  console.log(`MedPsy installed and SHA-256 verified: ${modelPath}`)
} finally {
  await close()
}
