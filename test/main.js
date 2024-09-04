import { join } from 'path'
import { spawnSync } from 'child_process'
import { describe, test } from 'node:test'

const __dirname = import.meta.dirname

const fixtures = join(__dirname, 'fixtures')
const cmd = [join(__dirname, '..', 'index.js')]

describe('main', () => {
  test('success', t => {
    t.plan(1)

    const { status } = spawnSync('node', [cmd], { cwd: join(fixtures, 'green') })

    t.assert.equal(status, 0)
  })

  test('handle not-found packages', t => {
    t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'not-found') })

    t.assert.match(stderr.toString(), /NOT-FOUND/)
    t.assert.equal(status, 1)
  })

  test('detects outdated', t => {
    t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'outdated') })

    t.assert.match(stderr.toString(), /OUTDATED/)
    t.assert.equal(status, 1)
  })
})

describe('flags', () => {
  test('with types', t => {
    t.plan(3)

    const { status, stderr } = spawnSync('node', [cmd, '--types=dependencies'], { cwd: join(fixtures, 'outdated') })

    t.assert.match(stderr.toString(), /connect/)
    t.assert.doesNotMatch(stderr.toString(), /npm/)
    t.assert.equal(status, 1)
  })

  test('silent', async t => {
    const { status, stderr } = spawnSync('node', [cmd, '--silent'], { cwd: join(fixtures, 'outdated') })

    t.assert.strictEqual(stderr.length, 0)
    t.assert.strictEqual(status, 1)
  })

  test('with scopes', t => {
    t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd, '--scopes=fastify'], { cwd: join(fixtures, 'outdated') })

    t.assert.doesNotMatch(stderr.toString(), /npm/)
    t.assert.equal(status, 1)
  })

  test('json output', t => {
    t.plan(2)

    const { status, stdout } = spawnSync('node', [cmd, '--json'], { cwd: join(fixtures, 'outdated') })

    t.assert.match(stdout.toString(), /"status":"outdated"/)
    t.assert.equal(status, 1)
  })

  test('ignore', t => {
    t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd, '--ignore=npm,connect,@fastify/basic-auth,once'], { cwd: join(fixtures, 'outdated') })

    t.assert.match(stderr.toString(), /NOT-SUPPORTED/)
    t.assert.equal(status, 0)
  })
})

describe('exceptions', () => {
  test('package.json exception', t => {
    t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: fixtures })

    t.assert.match(stderr.toString(), /Cannot find module/)
    t.assert.equal(status, 1)
  })

  test('spawn exception', t => {
    t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'invalid') })

    t.assert.match(stderr.toString(), /failed to run "npm show/)
    t.assert.equal(status, 1)
  })
})
