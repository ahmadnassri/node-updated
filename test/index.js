const { join } = require('path')
const { readFileSync } = require('fs')
const { spawnSync } = require('child_process')
const { test } = require('tap')

const args = [join(__dirname, '..', 'index.js')]

test('success', assert => {
  assert.plan(1)

  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'green') })

  assert.equal(result.status, 0)
})

test('outdated', assert => {
  assert.plan(2)

  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'outdated') })

  assert.match(result.stderr.toString(), /OUTDATED/)
  assert.equal(result.status, 1)
})

test('not-found', assert => {
  assert.plan(2)

  const result = spawnSync('node', args, { cwd: join(__dirname, 'fixtures', 'not-found') })

  assert.match(result.stderr.toString(), /NOT-FOUND/)
  assert.equal(result.status, 1)
})

test('silent', assert => {
  assert.plan(2)

  const result = spawnSync('node', args.concat(['--silent']), { cwd: join(__dirname, 'fixtures', 'outdated') })

  assert.equal(result.stderr.length, 0)
  assert.equal(result.status, 1)
})

test('json', assert => {
  assert.plan(2)

  const result = spawnSync('node', args.concat(['--json']), { cwd: join(__dirname, 'fixtures', 'outdated') })

  assert.match(result.stdout.toString(), /"status":"outdated"/)
  assert.equal(result.status, 1)
})

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

test('ignore', assert => {
  assert.plan(2)

  const result = spawnSync('node', args.concat(['--ignore=npm']), { cwd: join(__dirname, 'fixtures', 'outdated') })

  assert.notMatch(result.stderr.toString(), /npm/)
  assert.equal(result.status, 1)
})

test('update', assert => {
  assert.plan(3)

  // prep fixture
  spawnSync('cp', ['-r', 'outdated', 'updated'], { cwd: join(__dirname, 'fixtures') })

  const before = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'updated', 'package.json')))

  // run
  const result = spawnSync('node', args.concat(['--update']), { cwd: join(__dirname, 'fixtures', 'updated') })

  const after = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'updated', 'package.json')))

  // clean-up fixture
  spawnSync('rm', ['-rf', 'updated'], { cwd: join(__dirname, 'fixtures') })

  assert.notMatch(before, after)
  assert.equal(after.devDependencies.once, '^1.4.0')
  assert.equal(result.status, 0)
})
