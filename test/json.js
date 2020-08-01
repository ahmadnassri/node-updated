const { join } = require('path')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js')]

test('json', assert => {
  assert.plan(2)

  const result = spawnSync('node', args.concat(['--json']), { cwd: join(__dirname, 'fixtures', 'outdated') })

  assert.match(result.stdout.toString(), /"status":"outdated"/)
  assert.equal(result.status, 1)
})
