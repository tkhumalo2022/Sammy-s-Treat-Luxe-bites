import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('serverless output explicitly traces Sharp 0.35 Linux libvips', () => {
  const config = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8')
  const lock = readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')
  assert.match(config, /outputFileTracingIncludes/)
  assert.match(config, /sharp-libvips-linux-x64/)
  assert.match(lock, /node_modules\\/\@img\\/sharp-libvips-linux-x64/)
})
