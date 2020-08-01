const { join } = require('path')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js')]

test('not-found', assert => {
  assert.plan(2)

  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'not-found') })

  assert.match(result.stderr.toString(), /NOT-FOUND/)
  assert.equal(result.status, 1)
})
