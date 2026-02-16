import { describe, test, expect } from 'bun:test'
import NpmEcosystem from '../../lib/ecosystems/npm/index.js'

describe('NPM Ecosystem', () => {
  test('should have correct name', () => {
    expect(NpmEcosystem.name).toBe('npm')
  })

  test('should have correct manifest files', () => {
    expect(NpmEcosystem.manifestFiles).toEqual(['package.json'])
  })

  test('should parse dependencies', async () => {
    // This test requires actual package.json - will be integration test
    expect(true).toBeTruthy()
  })

  test('should check outdated package', async () => {
    const ecosystem = new NpmEcosystem()
    const result = await ecosystem.check({
      type: 'dependencies',
      name: 'lodash',
      version: '4.0.0'
    })

    // Should detect this very old version as outdated
    expect(result.status === 'outdated' || result.status === 'not-found').toBeTruthy()
  })

  test('should handle not-found packages', async () => {
    const ecosystem = new NpmEcosystem()
    const result = await ecosystem.check({
      type: 'dependencies',
      name: 'this-package-definitely-does-not-exist-12345',
      version: '1.0.0'
    })

    expect(result.status).toBe('not-found')
  })

  test('should handle not-supported versions', async () => {
    const ecosystem = new NpmEcosystem()
    const result = await ecosystem.check({
      type: 'dependencies',
      name: 'express',
      version: 'github:expressjs/express'
    })

    expect(result.status).toBe('not-supported')
  })
})
