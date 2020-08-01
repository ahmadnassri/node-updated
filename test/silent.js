const { join } = require('path')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js')]

test('silent', assert => {
  assert.plan(2)

  const result = spawnSync('node', args.concat(['--silent']), { cwd: join(__dirname, 'fixtures', 'outdated') })

  assert.equal(result.stderr.length, 0)
  assert.equal(result.status, 1)
})
