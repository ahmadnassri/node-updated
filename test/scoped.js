const { join } = require('path')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js'), '--scopes=telusdigital']

test('outdated', assert => {
  assert.plan(2)

  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'outdated') })

  assert.notMatch(result.stderr.toString(), /npm/)
  assert.equal(result.status, 1)
})
