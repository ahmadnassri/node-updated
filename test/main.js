import { join } from 'path'
import { spawnSync } from 'child_process'
import { describe, test } from 'node:test'
import assert from 'node:assert'

// node v18 support
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// node v20+ support
// const __dirname = import.meta.dirname

const fixtures = join(__dirname, 'fixtures')
const cmd = [join(__dirname, '..', 'index.js')]

describe('main', () => {
  test('success', t => {
    // t.plan(1)

    const { status } = spawnSync('node', [cmd], { cwd: join(fixtures, 'green') })

    assert.equal(status, 0)
  })

  test('handle not-found packages', t => {
    // t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'not-found') })

    assert.match(stderr.toString(), /NOT-FOUND/)
    assert.equal(status, 1)
  })

  test('detects outdated', t => {
    // t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'outdated') })

    assert.match(stderr.toString(), /OUTDATED/)
    assert.equal(status, 1)
  })
})

describe('flags', () => {
  test('with types', t => {
    // t.plan(3)

    const { status, stderr } = spawnSync('node', [cmd, '--types=dependencies'], { cwd: join(fixtures, 'outdated') })

    assert.match(stderr.toString(), /connect/)
    assert.doesNotMatch(stderr.toString(), /npm/)
    assert.equal(status, 1)
  })

  test('silent', async t => {
    const { status, stderr } = spawnSync('node', [cmd, '--silent'], { cwd: join(fixtures, 'outdated') })

    assert.strictEqual(stderr.length, 0)
    assert.strictEqual(status, 1)
  })

  test('with scopes', t => {
    // t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd, '--scopes=fastify'], { cwd: join(fixtures, 'outdated') })

    assert.doesNotMatch(stderr.toString(), /npm/)
    assert.equal(status, 1)
  })

  test('json output', t => {
    // t.plan(2)

    const { status, stdout } = spawnSync('node', [cmd, '--json'], { cwd: join(fixtures, 'outdated') })

    assert.match(stdout.toString(), /"status":"outdated"/)
    assert.equal(status, 1)
  })

  test('ignore', t => {
    // t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd, '--ignore=npm,connect,@fastify/basic-auth,once'], { cwd: join(fixtures, 'outdated') })

    assert.match(stderr.toString(), /NOT-SUPPORTED/)
    assert.equal(status, 0)
  })
})

describe('exceptions', () => {
  test('package.json exception', t => {
    // t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: fixtures })

    assert.match(stderr.toString(), /Cannot find module/)
    assert.equal(status, 1)
  })

  test('spawn exception', t => {
    // t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'invalid') })

    assert.match(stderr.toString(), /failed to run "npm show/)
    assert.equal(status, 1)
  })
})
