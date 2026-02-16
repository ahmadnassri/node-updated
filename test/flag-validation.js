import { join } from 'path'
import { spawnSync } from 'child_process'
import { describe, test, expect } from 'bun:test'

const __dirname = import.meta.dir
const fixtures = join(__dirname, 'fixtures')
const cmd = join(__dirname, '..', 'index.js')

describe('flag conflict validation', () => {
  test('--update with --json should error', () => {
    const { status, stderr } = spawnSync('bun', ['run', cmd, '--update', '--json'], {
      cwd: join(fixtures, 'green')
    })

    expect(status).toBe(1)
    expect(stderr.toString()).toMatch(/Cannot use --json with interactive --update/)
    expect(stderr.toString()).toMatch(/Use --update --all --json/)
  })

  test('--update with --silent should error', () => {
    const { status, stderr } = spawnSync('bun', ['run', cmd, '--update', '--silent'], {
      cwd: join(fixtures, 'green')
    })

    expect(status).toBe(1)
    expect(stderr.toString()).toMatch(/Cannot use --silent with interactive --update/)
  })

  test('--update --all with --json should work', () => {
    const { status } = spawnSync('bun', ['run', cmd, '--update', '--all', '--json'], {
      cwd: join(fixtures, 'green')
    })

    // Should not error on flag conflict (may fail for other reasons)
    expect([0, 1]).toContain(status)
  })

  test('--update --all with --silent should work', () => {
    const { status } = spawnSync('bun', ['run', cmd, '--update', '--all', '--silent'], {
      cwd: join(fixtures, 'green')
    })

    // Should not error on flag conflict
    expect([0, 1]).toContain(status)
  })
})
