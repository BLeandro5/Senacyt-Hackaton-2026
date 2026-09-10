import test from 'node:test'
import assert from 'node:assert/strict'
import { detectUserLanguage } from '../src/data/language.ts'

test('validation UI follows Spanish, English, and Portuguese observations', () => {
  assert.equal(detectUserLanguage('Veo dos equipos y uno tiene ocho anos.'), 'es')
  assert.equal(detectUserLanguage('There are two CT systems, one is six years old.'), 'en')
  assert.equal(detectUserLanguage('Ha dois equipamentos e um tem oito anos.'), 'pt')
})
