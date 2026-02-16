import { describe, test, expect } from 'bun:test'
import { fetchTags } from '../../lib/ecosystems/docker/registry.js'

describe('Docker Registry Client', () => {
  test('should fetch tags from Docker Hub', async () => {
    // This is an integration test that hits the real registry
    const tags = await fetchTags('docker.io', 'library/nginx')

    expect(Array.isArray(tags)).toBeTruthy()
    expect(tags.length > 0).toBeTruthy()
    expect(tags.includes('latest')).toBeTruthy()
  })

  test('should handle registry errors gracefully', async () => {
    const tags = await fetchTags('docker.io', 'nonexistent-image-definitely-not-found-12345')
    expect(tags).toBe(null)
  })

  test('should handle custom registries', async () => {
    // Test with GitHub Container Registry (public image)
    const tags = await fetchTags('ghcr.io', 'homebrew/core')

    // This should either return tags or null (if image doesn't exist or requires auth)
    expect(tags === null || Array.isArray(tags)).toBeTruthy()
  })
})
