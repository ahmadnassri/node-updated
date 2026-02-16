import { join } from 'path'
import { spawnSync } from 'child_process'
import { describe, test, expect } from 'bun:test'

// node v18 support
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// node v20+ support
// const __dirname = import.meta.dirname

const fixtures = join(__dirname, 'fixtures')
const cmd = [join(__dirname, '..', 'index.js')]

describe('main', () => {
  test('success', () => {
    const { status } = spawnSync('bun', ['run', ...cmd], { cwd: join(fixtures, 'green') })

    expect(status).toBe(0)
  })

  test('handle not-found packages', () => {
    const { status, stderr } = spawnSync('bun', ['run', ...cmd], { cwd: join(fixtures, 'not-found') })

    expect(stderr.toString()).toMatch(/NOT-FOUND/)
    expect(status).toBe(1)
  })

  test('detects outdated', () => {
    const { status, stderr } = spawnSync('bun', ['run', ...cmd], { cwd: join(fixtures, 'outdated') })

    expect(stderr.toString()).toMatch(/OUTDATED/)
    expect(status).toBe(1)
  })
})

describe('flags', () => {
  test('with types', () => {
    const { status, stderr } = spawnSync('bun', ['run', ...cmd, '--types=dependencies'], { cwd: join(fixtures, 'outdated') })

    expect(stderr.toString()).toMatch(/connect/)
    // Check that npm package (from peerDependencies) is not listed in the table
    expect(stderr.toString()).not.toMatch(/│\s+npm\s+│/)
    expect(status).toBe(1)
  })

  test('silent', () => {
    const { status, stderr } = spawnSync('bun', ['run', ...cmd, '--silent'], { cwd: join(fixtures, 'outdated') })

    expect(stderr.length).toBe(0)
    expect(status).toBe(1)
  })

  test('with scopes', () => {
    const { status, stderr } = spawnSync('bun', ['run', ...cmd, '--scopes=fastify'], { cwd: join(fixtures, 'outdated') })

    // Check that npm package (not fastify-scoped) is not listed in the table
    expect(stderr.toString()).not.toMatch(/│\s+npm\s+│/)
    expect(status).toBe(1)
  })

  test('json output', () => {
    const { status, stdout } = spawnSync('bun', ['run', ...cmd, '--json'], { cwd: join(fixtures, 'outdated') })

    expect(stdout.toString()).toMatch(/"status":"outdated"/)
    expect(status).toBe(1)
  })

  test('ignore', () => {
    const { status, stderr } = spawnSync('bun', ['run', ...cmd, '--ignore=npm,connect,@fastify/basic-auth,once'], { cwd: join(fixtures, 'outdated') })

    expect(stderr.toString()).toMatch(/NOT-SUPPORTED/)
    expect(status).toBe(0)
  })
})

describe('exceptions', () => {
  test('package.json exception', () => {
    const { status, stderr } = spawnSync('bun', ['run', ...cmd], { cwd: fixtures })

    expect(stderr.toString()).toMatch(/No package\.json or compose files found/)
    expect(status).toBe(1)
  })

  test('spawn exception', () => {
    const { status, stderr } = spawnSync('bun', ['run', ...cmd], { cwd: join(fixtures, 'invalid') })

    // Our Bun-native registry client validates package names and returns NOT-FOUND for invalid names
    expect(stderr.toString()).toMatch(/NOT-FOUND/)
    expect(status).toBe(1)
  })
})
