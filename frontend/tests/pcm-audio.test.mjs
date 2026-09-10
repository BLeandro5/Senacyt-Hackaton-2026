import test from 'node:test'
import assert from 'node:assert/strict'
import { pcmWav } from '../src/data/pcmAudio.ts'

test('local PCM encoder creates mono 16k WAV from browser samples',()=>{
  const wav=pcmWav([new Float32Array(48000).fill(0.2),new Float32Array(48000).fill(0.2)],48000)
  const view=new DataView(wav)
  assert.equal(wav.byteLength,32044)
  assert.equal(view.getUint16(22,true),1)
  assert.equal(view.getUint32(24,true),16000)
  assert.equal(view.getUint16(34,true),16)
  assert.throws(()=>pcmWav([],48000))
})
