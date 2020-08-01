const { join } = require('path')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js')]

test('package.json exception', assert => {
  assert.plan(2)

  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures') })

  assert.match(result.stderr.toString(), /Cannot find module/)
  assert.equal(result.status, 1)
})

test('spawn exception', assert => {
  assert.plan(2)

  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'invalid') })

  assert.match(result.stderr.toString(), /failed to run `npm show`/)
  assert.equal(result.status, 1)
})
