const { join } = require('path')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const cwd = join(__dirname, 'fixtures', 'outdated')
const args = [join(__dirname, '..', 'index.js'), '--ignore=npm,connect,@telusdigital/nightwatch-seo,once']

test('ignore', assert => {
  assert.plan(2)

  const result = spawnSync('node', args, { cwd })

  assert.match(result.stderr.toString(), /NOT-SUPPORTED/)
  assert.equal(result.status, 0)
})
