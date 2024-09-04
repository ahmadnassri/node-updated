import { tmpdir } from 'os'
import { join } from 'path'
import { readFile, cp, rm, mkdtemp } from 'fs/promises'
import { spawnSync } from 'child_process'
import { describe, test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

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

  test('updates package.json', async t => {
    // t.plan(3)

    // prep fixture
    await cp(join(fixtures, 'outdated'), cwd, fsOpts)

    // read before state
    const before = JSON.parse(await readFile(join(fixtures, 'outdated', 'package.json')))

    // run
    const result = spawnSync('node', [cmd, '--update'], { cwd })

    // read after state
    const after = JSON.parse(await readFile(join(cwd, 'package.json')))

    assert.notEqual(before, after)
    assert.equal(after.devDependencies.once, '^1.4.0')
    assert.equal(result.status, 0)
  })

  test('updates nothing with empty types', async t => {
    // t.plan(3)

    // prep fixture
    await cp(join(fixtures, 'outdated'), cwd, fsOpts)

    // read before state
    const before = JSON.parse(await readFile(join(fixtures, 'outdated', 'package.json')))

    // run
    const result = spawnSync('node', [cmd, '--update', '--types='], { cwd })

    // read after state
    const after = JSON.parse(await readFile(join(cwd, 'package.json')))

    assert.deepEqual(before, after)
    assert.equal(after.devDependencies.once, '^1.3.1')
    assert.equal(result.status, 0)
  })
})
