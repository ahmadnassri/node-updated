const { join } = require('path')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js')]

test('success', assert => {
  assert.plan(1)

  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'green') })

  assert.equal(result.status, 0)
})
