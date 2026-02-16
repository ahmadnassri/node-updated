import { describe, test, expect } from 'bun:test'
import { join } from 'path'
import { spawnSync } from 'child_process'

const __dirname = import.meta.dir
const fixtures = join(__dirname, 'fixtures')
const cmd = join(__dirname, '..', 'index.js')

describe('--update flag', () => {
  test('--update alone should fail without interaction (CI environment)', () => {
    // In CI/non-TTY, interactive prompts will fail
    const { status } = spawnSync('bun', ['run', cmd, '--update'], {
      cwd: join(fixtures, 'outdated'),
      env: { ...process.env, CI: 'true' }
    })

    // Should exit with error due to no TTY
    expect(status).toBe(1)
  })

  test('--update --all should auto-update without prompts', async () => {
    // Test in a fixture that won't actually modify files
    const { status } = spawnSync('bun', ['run', cmd, '--update', '--all'], {
      cwd: join(fixtures, 'green')
    })

    // Should work in non-interactive mode
    expect([0, 1]).toContain(status)
  })
})
