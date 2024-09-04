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

describe('workspaces', () => {
  test('does not process workspaces by default', t => {
    // t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'workspaces') })

    assert.doesNotMatch(stderr.toString(), /processing workspace/)
    assert.equal(status, 1)
  })

  test('with --workspaces', t => {
    // t.plan(3)

    const { status, stdout } = spawnSync('node', [cmd, '--workspaces'], { cwd: join(fixtures, 'workspaces') })

    assert.match(stdout.toString(), /processing workspace: root/)
    assert.match(stdout.toString(), /processing workspace: packages\/foo/)
    assert.equal(status, 1)
  })
})
