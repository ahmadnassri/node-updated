const { join } = require('path')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const cwd = join(__dirname, 'fixtures', 'outdated')
const args = [join(__dirname, '..', 'index.js'), '--types=dependencies']

test('types', assert => {
  assert.plan(3)

  const result = spawnSync('node', args, { cwd })

  assert.match(result.stderr.toString(), /connect/)
  assert.notMatch(result.stderr.toString(), /npm/)
  assert.equal(result.status, 1)
})
