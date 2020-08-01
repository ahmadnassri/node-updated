const { join } = require('path')
const { promises: { readFile } } = require('fs')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js'), '--update']

test('update', async assert => {
  assert.plan(3)

  // prep fixture
  spawnSync('cp', ['-r', 'outdated', 'updated'], { cwd: join(__dirname, 'fixtures') })

  const before = JSON.parse(await readFile(join(__dirname, 'fixtures', 'updated', 'package.json')))

  // run
  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'updated') })

  const after = JSON.parse(await readFile(join(__dirname, 'fixtures', 'updated', 'package.json')))

  // clean-up fixture
  spawnSync('rm', ['-rf', 'updated'], { cwd: join(__dirname, 'fixtures') })

  assert.notMatch(before, after)
  assert.equal(after.devDependencies.once, '^1.4.0')
  assert.equal(result.status, 0)
})
