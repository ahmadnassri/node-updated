const { join } = require('path')
const { promises: { readFile } } = require('fs')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js'), '--update', '--types=']

test('update', async assert => {
  assert.plan(3)

  // prep fixture
  spawnSync('cp', ['-r', 'outdated', 'no-update'], { cwd: join(__dirname, 'fixtures') })

  const before = JSON.parse(await readFile(join(__dirname, 'fixtures', 'no-update', 'package.json')))

  // run
  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'no-update') })

  const after = JSON.parse(await readFile(join(__dirname, 'fixtures', 'no-update', 'package.json')))

  // clean-up fixture
  spawnSync('rm', ['-rf', 'no-update'], { cwd: join(__dirname, 'fixtures') })

  assert.match(before, after)
  assert.equal(after.devDependencies.once, '^1.3.1')
  assert.equal(result.status, 0)
})
