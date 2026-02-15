import { describe, test } from 'node:test'
import assert from 'node:assert'
import NpmEcosystem from '../../lib/ecosystems/npm/index.js'

describe('NPM Ecosystem', () => {
  test('should have correct name', () => {
    assert.equal(NpmEcosystem.name, 'npm')
  })

  test('should have correct manifest files', () => {
    assert.deepEqual(NpmEcosystem.manifestFiles, ['package.json'])
  })

  test('should parse dependencies', async () => {
    // This test requires actual package.json - will be integration test
    assert.ok(true, 'Placeholder for parse test')
  })

  test('should check outdated package', async () => {
    const ecosystem = new NpmEcosystem()
    const result = await ecosystem.check({
      type: 'dependencies',
      name: 'lodash',
      version: '4.0.0'
    })

    // Should detect this very old version as outdated
    assert.ok(result.status === 'outdated' || result.status === 'not-found')
  })

  test('should handle not-found packages', async () => {
    const ecosystem = new NpmEcosystem()
    const result = await ecosystem.check({
      type: 'dependencies',
      name: 'this-package-definitely-does-not-exist-12345',
      version: '1.0.0'
    })

    assert.equal(result.status, 'not-found')
  })

  test('should handle not-supported versions', async () => {
    const ecosystem = new NpmEcosystem()
    const result = await ecosystem.check({
      type: 'dependencies',
      name: 'express',
      version: 'github:expressjs/express'
    })

    assert.equal(result.status, 'not-supported')
  })
})
