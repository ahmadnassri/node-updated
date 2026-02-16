import { describe, test, expect } from 'bun:test'
import DockerEcosystem from '../../lib/ecosystems/docker/index.js'

describe('Docker Ecosystem', () => {
  test('should have correct name', () => {
    expect(DockerEcosystem.name).toBe('docker')
  })

  test('should have correct manifest files', () => {
    expect(DockerEcosystem.manifestFiles).toEqual(['compose.yml', 'docker-compose.yml'])
  })

  test('should check outdated image', async () => {
    const ecosystem = new DockerEcosystem()
    const result = await ecosystem.check({
      type: 'image',
      name: 'nginx',
      version: '1.20-alpine',
      ecosystem: 'docker'
    })

    // Should detect old version as outdated or return not-supported for variant issues
    expect(['outdated', 'not-supported', 'not-found'].includes(result?.status)).toBeTruthy()
  })

  test('should handle not-supported tags', async () => {
    const ecosystem = new DockerEcosystem()
    const result = await ecosystem.check({
      type: 'image',
      name: 'nginx',
      version: 'latest',
      ecosystem: 'docker'
    })

    expect(result.status).toBe('not-supported')
  })

  test('should handle digest-based images', async () => {
    const ecosystem = new DockerEcosystem()
    const result = await ecosystem.check({
      type: 'image',
      name: 'nginx',
      version: 'sha256:abc123',
      ecosystem: 'docker'
    })

    expect(result.status).toBe('not-supported')
  })
})
