import { describe, test, expect } from 'bun:test'
import { parseNpmrc, buildRegistryUrl, fetchRegistry } from '../../lib/ecosystems/npm/registry-client.js'

describe('parseNpmrc', () => {
  test('should parse default registry', async () => {
    const config = await parseNpmrc('')
    expect(config.registry).toBe('https://registry.npmjs.org')
  })

  test('should parse custom registry', async () => {
    const content = 'registry=https://custom.registry.com'
    const config = await parseNpmrc(content)
    expect(config.registry).toBe('https://custom.registry.com')
  })

  test('should parse auth token', async () => {
    const content = '//registry.npmjs.org/:_authToken=test-token-123'
    const config = await parseNpmrc(content)
    expect(config.authTokens['registry.npmjs.org']).toBe('test-token-123')
  })

  test('should parse scoped registry', async () => {
    const content = '@myorg:registry=https://myorg.registry.com'
    const config = await parseNpmrc(content)
    expect(config.scopedRegistries['@myorg']).toBe('https://myorg.registry.com')
  })
})

describe('buildRegistryUrl', () => {
  test('should build URL for unscoped package', () => {
    const config = { registry: 'https://registry.npmjs.org', scopedRegistries: {} }
    const url = buildRegistryUrl('lodash', '4.17.21', config)
    expect(url).toBe('https://registry.npmjs.org/lodash/4.17.21')
  })

  test('should build URL for scoped package with default registry', () => {
    const config = { registry: 'https://registry.npmjs.org', scopedRegistries: {} }
    const url = buildRegistryUrl('@babel/core', '7.0.0', config)
    expect(url).toBe('https://registry.npmjs.org/@babel/core/7.0.0')
  })

  test('should use scoped registry for scoped package', () => {
    const config = {
      registry: 'https://registry.npmjs.org',
      scopedRegistries: { '@myorg': 'https://myorg.registry.com' }
    }
    const url = buildRegistryUrl('@myorg/package', '1.0.0', config)
    expect(url).toBe('https://myorg.registry.com/@myorg/package/1.0.0')
  })

  test('should build URL without version', () => {
    const config = { registry: 'https://registry.npmjs.org', scopedRegistries: {} }
    const url = buildRegistryUrl('lodash', null, config)
    expect(url).toBe('https://registry.npmjs.org/lodash')
  })
})

describe('fetchRegistry', () => {
  test('should fetch package info from registry', async () => {
    const url = 'https://registry.npmjs.org/semver/7.3.7'
    const data = await fetchRegistry(url, null)

    expect(data).toBeDefined()
    expect(data.name).toBe('semver')
    expect(data.version).toBe('7.3.7')
  })

  test('should throw NotFoundError for missing package', async () => {
    const url = 'https://registry.npmjs.org/this-package-definitely-does-not-exist-12345'

    await expect(fetchRegistry(url, null)).rejects.toThrow('not found')
  })
})
