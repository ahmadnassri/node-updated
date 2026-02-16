import { describe, test, expect } from 'bun:test'
import { parseNpmrc } from '../../lib/ecosystems/npm/registry-client.js'

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
