import { tmpdir } from 'os'
import { join } from 'path'
import { readFile, cp, rm, mkdtemp } from 'fs/promises'
import { spawnSync } from 'child_process'
import { describe, test, beforeEach, afterEach, expect } from 'bun:test'

// node v18 support
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// node v20+ support
// const __dirname = import.meta.dirname

const fsOpts = { recursive: true }
const fixtures = join(__dirname, 'fixtures')
const cmd = join(__dirname, '..', 'index.js')

let cwd

describe('with --update', () => {
  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'updated-test-'))
  })

  afterEach(() => rm(cwd, fsOpts))

  test('updates package.json', async () => {
    // prep fixture
    await cp(join(fixtures, 'outdated'), cwd, fsOpts)

    // read before state
    const before = JSON.parse(await readFile(join(fixtures, 'outdated', 'package.json')))

    // run
    const result = spawnSync('bun', ['run', cmd, '--update'], { cwd })

    // read after state
    const after = JSON.parse(await readFile(join(cwd, 'package.json')))

    expect(before).not.toEqual(after)
    expect(after.devDependencies.once).toBe('^1.4.0')
    expect(result.status).toBe(0)
  })

  test('updates nothing with empty types', async () => {
    // prep fixture
    await cp(join(fixtures, 'outdated'), cwd, fsOpts)

    // read before state
    const before = JSON.parse(await readFile(join(fixtures, 'outdated', 'package.json')))

    // run
    const result = spawnSync('bun', ['run', cmd, '--update', '--types='], { cwd })

    // read after state
    const after = JSON.parse(await readFile(join(cwd, 'package.json')))

    expect(before).toEqual(after)
    expect(after.devDependencies.once).toBe('^1.3.1')
    expect(result.status).toBe(0)
  })
})
