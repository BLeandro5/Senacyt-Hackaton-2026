import { downloadFinetuneModel, finetuneModelPath } from './finetune-model.mjs'

try {
  await downloadFinetuneModel()
  console.log(`Verified fine-tuning model: ${finetuneModelPath}`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
