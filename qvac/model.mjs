import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { HEALTHCARE_1_7B_MEDICAL_Q4_K_M } from '@qvac/sdk'

export const descriptor = HEALTHCARE_1_7B_MEDICAL_Q4_K_M
export const modelName = 'MedPsy-1.7B'
export const quantization = 'Q4_K_M (imatrix)'
export const modelPath = process.env.QVAC_MODEL_PATH || fileURLToPath(
  new URL(`../models/${descriptor.modelId}`, import.meta.url),
)
export const downloadUrl = `https://huggingface.co/${descriptor.registryPath}`

export async function verifyModel(target = modelPath) {
  if ((await stat(target)).size !== descriptor.expectedSize) throw new Error('MedPsy file size does not match the official model')
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(target)) hash.update(chunk)
  if (hash.digest('hex') !== descriptor.sha256Checksum) throw new Error('MedPsy SHA-256 mismatch')
  return path.resolve(target)
}
