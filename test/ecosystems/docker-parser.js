import { describe, test, expect } from 'bun:test'
import { parseImage } from '../../lib/ecosystems/docker/parser.js'

describe('Docker Image Parser', () => {
  test('should parse simple image', () => {
    const result = parseImage('nginx:1.20')
    expect(result.registry).toBe('docker.io')
    expect(result.name).toBe('library/nginx')
    expect(result.tag).toBe('1.20')
  })

  test('should parse image with registry', () => {
    const result = parseImage('ghcr.io/owner/app:v2.0')
    expect(result.registry).toBe('ghcr.io')
    expect(result.name).toBe('owner/app')
    expect(result.tag).toBe('v2.0')
  })

  test('should parse image with custom port', () => {
    const result = parseImage('registry.company.com:5000/internal:latest')
    expect(result.registry).toBe('registry.company.com:5000')
    expect(result.name).toBe('internal')
    expect(result.tag).toBe('latest')
  })

  test('should handle scoped images', () => {
    const result = parseImage('myregistry/namespace/image:tag')
    expect(result.name).toBe('namespace/image')
    expect(result.tag).toBe('tag')
  })

  test('should default to latest tag', () => {
    const result = parseImage('nginx')
    expect(result.tag).toBe('latest')
  })

  test('should handle digest-based references', () => {
    const result = parseImage('nginx@sha256:abc123')
    expect(result.registry).toBe('docker.io')
    expect(result.name).toBe('library/nginx')
    expect(result.tag).toBe('sha256:abc123')
  })

  test('should handle digest with custom registry', () => {
    const result = parseImage('ghcr.io/owner/app@sha256:def456')
    expect(result.registry).toBe('ghcr.io')
    expect(result.name).toBe('owner/app')
    expect(result.tag).toBe('sha256:def456')
  })

  test('should reject empty input', () => {
    expect(() => parseImage('')).toThrow(/Invalid image reference/)
  })

  test('should reject null input', () => {
    expect(() => parseImage(null)).toThrow(/Invalid image reference/)
  })

  test('should handle localhost registry', () => {
    const result = parseImage('localhost:5000/app:v1')
    expect(result.registry).toBe('localhost:5000')
    expect(result.name).toBe('app')
    expect(result.tag).toBe('v1')
  })

  test('should default to latest for custom registry without tag', () => {
    const result = parseImage('ghcr.io/owner/app')
    expect(result.registry).toBe('ghcr.io')
    expect(result.name).toBe('owner/app')
    expect(result.tag).toBe('latest')
  })
})
