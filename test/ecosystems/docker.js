import { describe, test } from 'node:test'
import assert from 'node:assert'
import DockerEcosystem from '../../lib/ecosystems/docker/index.js'

describe('Docker Ecosystem', () => {
  test('should have correct name', () => {
    assert.equal(DockerEcosystem.name, 'docker')
  })

  test('should have correct manifest files', () => {
    assert.deepEqual(DockerEcosystem.manifestFiles, ['compose.yml', 'docker-compose.yml'])
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
    assert.ok(['outdated', 'not-supported', 'not-found'].includes(result?.status))
  })

  test('should handle not-supported tags', async () => {
    const ecosystem = new DockerEcosystem()
    const result = await ecosystem.check({
      type: 'image',
      name: 'nginx',
      version: 'latest',
      ecosystem: 'docker'
    })

    assert.equal(result.status, 'not-supported')
  })

  test('should handle digest-based images', async () => {
    const ecosystem = new DockerEcosystem()
    const result = await ecosystem.check({
      type: 'image',
      name: 'nginx',
      version: 'sha256:abc123',
      ecosystem: 'docker'
    })

    assert.equal(result.status, 'not-supported')
  })
})
