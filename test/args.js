import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { spawnSync } from 'child_process'
import { join } from 'path'
import { writeFileSync, unlinkSync } from 'fs'

// node v18 support
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const helperScript = join(__dirname, 'args-helper.js')

describe('args parser', () => {
  beforeEach(() => {
    // Create a helper script that imports args and outputs the value
    writeFileSync(helperScript, `
import args from '../lib/args.js'
console.log(JSON.stringify({ all: args.all }))
`)
  })

  afterEach(() => {
    unlinkSync(helperScript)
  })

  test('parses --all flag as boolean', () => {
    const { stdout } = spawnSync('bun', ['run', helperScript, '--all'], {
      cwd: __dirname
    })

    const result = JSON.parse(stdout.toString().trim())
    expect(result.all).toBe(true)
  })

  test('--all defaults to false when not provided', () => {
    const { stdout } = spawnSync('bun', ['run', helperScript, '--update'], {
      cwd: __dirname
    })

    const result = JSON.parse(stdout.toString().trim())
    expect(result.all).toBe(false)
  })
})
