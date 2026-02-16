import { describe, test, expect } from 'bun:test'
import { parseTag, compareImageVersions, findLatestTag } from '../../lib/ecosystems/docker/tags.js'

describe('Docker Tag Parsing', () => {
  test('should parse version-only tag', () => {
    const result = parseTag('7.3.0')
    expect(result.version).toBe('7.3.0')
    expect(result.variant).toBe('')
  })

  test('should parse tag with variant', () => {
    const result = parseTag('18-alpine')
    expect(result.version).toBe('18')
    expect(result.variant).toBe('-alpine')
  })

  test('should parse complex variant', () => {
    const result = parseTag('20.11.1-alpine3.18-slim')
    expect(result.version).toBe('20.11.1')
    expect(result.variant).toBe('-alpine3.18-slim')
  })

  test('should handle v prefix', () => {
    const result = parseTag('v7.3.0')
    expect(result.version).toBe('7.3.0')
    expect(result.variant).toBe('')
  })

  test('should return null for non-semver tags', () => {
    expect(parseTag('latest')).toBe(null)
    expect(parseTag('stable')).toBe(null)
    expect(parseTag('lts')).toBe(null)
  })
})

describe('Docker Tag Comparison', () => {
  test('should compare versions correctly', () => {
    expect(compareImageVersions('1.0.0', '2.0.0') < 0).toBeTruthy()
    expect(compareImageVersions('2.0.0', '1.0.0') > 0).toBeTruthy()
    expect(compareImageVersions('1.0.0', '1.0.0') === 0).toBeTruthy()
  })

  test('should find latest matching tag', () => {
    const tags = ['18-alpine', '18.2-alpine', '19-alpine', '20-alpine', '21-alpine']
    const result = findLatestTag('18-alpine', tags)
    expect(result).toBe('21-alpine')
  })

  test('should respect variant matching', () => {
    const tags = ['18-alpine', '18-slim', '19-alpine', '19-slim']
    const result = findLatestTag('18-alpine', tags)
    expect(result).toBe('19-alpine')
  })

  test('should handle minor version updates', () => {
    const tags = ['18-alpine', '18.2-alpine', '18.20-alpine', '19-alpine']
    const result = findLatestTag('18-alpine', tags, 'minor')
    expect(result).toBe('18.20-alpine')
  })

  test('should return null when no newer version', () => {
    const tags = ['18-alpine', '17-alpine']
    const result = findLatestTag('18-alpine', tags)
    expect(result).toBe(null)
  })
})
