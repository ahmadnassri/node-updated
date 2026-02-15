import { describe, test } from 'node:test'
import assert from 'node:assert'
import { parseTag, compareImageVersions, findLatestTag } from '../../lib/ecosystems/docker/tags.js'

describe('Docker Tag Parsing', () => {
  test('should parse version-only tag', () => {
    const result = parseTag('7.3.0')
    assert.equal(result.version, '7.3.0')
    assert.equal(result.variant, '')
  })

  test('should parse tag with variant', () => {
    const result = parseTag('18-alpine')
    assert.equal(result.version, '18')
    assert.equal(result.variant, '-alpine')
  })

  test('should parse complex variant', () => {
    const result = parseTag('20.11.1-alpine3.18-slim')
    assert.equal(result.version, '20.11.1')
    assert.equal(result.variant, '-alpine3.18-slim')
  })

  test('should handle v prefix', () => {
    const result = parseTag('v7.3.0')
    assert.equal(result.version, '7.3.0')
    assert.equal(result.variant, '')
  })

  test('should return null for non-semver tags', () => {
    assert.equal(parseTag('latest'), null)
    assert.equal(parseTag('stable'), null)
    assert.equal(parseTag('lts'), null)
  })
})

describe('Docker Tag Comparison', () => {
  test('should compare versions correctly', () => {
    assert.ok(compareImageVersions('1.0.0', '2.0.0') < 0)
    assert.ok(compareImageVersions('2.0.0', '1.0.0') > 0)
    assert.ok(compareImageVersions('1.0.0', '1.0.0') === 0)
  })

  test('should find latest matching tag', () => {
    const tags = ['18-alpine', '18.2-alpine', '19-alpine', '20-alpine', '21-alpine']
    const result = findLatestTag('18-alpine', tags)
    assert.equal(result, '21-alpine')
  })

  test('should respect variant matching', () => {
    const tags = ['18-alpine', '18-slim', '19-alpine', '19-slim']
    const result = findLatestTag('18-alpine', tags)
    assert.equal(result, '19-alpine')
  })

  test('should handle minor version updates', () => {
    const tags = ['18-alpine', '18.2-alpine', '18.20-alpine', '19-alpine']
    const result = findLatestTag('18-alpine', tags, 'minor')
    assert.equal(result, '18.20-alpine')
  })

  test('should return null when no newer version', () => {
    const tags = ['18-alpine', '17-alpine']
    const result = findLatestTag('18-alpine', tags)
    assert.equal(result, null)
  })
})
