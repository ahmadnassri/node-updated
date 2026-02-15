import { describe, test } from 'node:test'
import assert from 'node:assert'
import { parseImage } from '../../lib/ecosystems/docker/parser.js'

describe('Docker Image Parser', () => {
  test('should parse simple image', () => {
    const result = parseImage('nginx:1.20')
    assert.equal(result.registry, 'docker.io')
    assert.equal(result.name, 'library/nginx')
    assert.equal(result.tag, '1.20')
  })

  test('should parse image with registry', () => {
    const result = parseImage('ghcr.io/owner/app:v2.0')
    assert.equal(result.registry, 'ghcr.io')
    assert.equal(result.name, 'owner/app')
    assert.equal(result.tag, 'v2.0')
  })

  test('should parse image with custom port', () => {
    const result = parseImage('registry.company.com:5000/internal:latest')
    assert.equal(result.registry, 'registry.company.com:5000')
    assert.equal(result.name, 'internal')
    assert.equal(result.tag, 'latest')
  })

  test('should handle scoped images', () => {
    const result = parseImage('myregistry/namespace/image:tag')
    assert.equal(result.name, 'namespace/image')
    assert.equal(result.tag, 'tag')
  })

  test('should default to latest tag', () => {
    const result = parseImage('nginx')
    assert.equal(result.tag, 'latest')
  })

  test('should handle digest-based references', () => {
    const result = parseImage('nginx@sha256:abc123')
    assert.equal(result.registry, 'docker.io')
    assert.equal(result.name, 'library/nginx')
    assert.equal(result.tag, 'sha256:abc123')
  })

  test('should handle digest with custom registry', () => {
    const result = parseImage('ghcr.io/owner/app@sha256:def456')
    assert.equal(result.registry, 'ghcr.io')
    assert.equal(result.name, 'owner/app')
    assert.equal(result.tag, 'sha256:def456')
  })

  test('should reject empty input', () => {
    assert.throws(() => parseImage(''), /Invalid image reference/)
  })

  test('should reject null input', () => {
    assert.throws(() => parseImage(null), /Invalid image reference/)
  })

  test('should handle localhost registry', () => {
    const result = parseImage('localhost:5000/app:v1')
    assert.equal(result.registry, 'localhost:5000')
    assert.equal(result.name, 'app')
    assert.equal(result.tag, 'v1')
  })

  test('should default to latest for custom registry without tag', () => {
    const result = parseImage('ghcr.io/owner/app')
    assert.equal(result.registry, 'ghcr.io')
    assert.equal(result.name, 'owner/app')
    assert.equal(result.tag, 'latest')
  })
})
