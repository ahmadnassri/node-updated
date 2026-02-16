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

describe('workspaces', () => {
  test('does not process workspaces by default', () => {
    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'workspaces') })

    expect(stderr.toString()).not.toMatch(/processing workspace/)
    expect(status).toBe(1)
  })

  test('with --workspaces', () => {
    const { status, stdout } = spawnSync('node', [cmd, '--workspaces'], { cwd: join(fixtures, 'workspaces') })

    expect(stdout.toString()).toMatch(/processing workspace: root/)
    expect(stdout.toString()).toMatch(/processing workspace: packages\/foo/)
    expect(status).toBe(1)
  })
})
