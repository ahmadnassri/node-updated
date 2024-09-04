import { join } from 'path'
import { spawnSync } from 'child_process'
import { describe, test } from 'node:test'

const __dirname = import.meta.dirname

const fixtures = join(__dirname, 'fixtures')
const cmd = [join(__dirname, '..', 'index.js')]

describe('workspaces', () => {
  test('does not process workspaces by default', t => {
    t.plan(2)

    const { status, stderr } = spawnSync('node', [cmd], { cwd: join(fixtures, 'workspaces') })

    t.assert.doesNotMatch(stderr.toString(), /processing workspace/)
    t.assert.equal(status, 1)
  })

  test('with --workspaces', t => {
    t.plan(3)

    const { status, stdout } = spawnSync('node', [cmd, '--workspaces'], { cwd: join(fixtures, 'workspaces') })

    t.assert.match(stdout.toString(), /processing workspace: root/)
    t.assert.match(stdout.toString(), /processing workspace: packages\/foo/)
    t.assert.equal(status, 1)
  })
})
