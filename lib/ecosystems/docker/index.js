import Ecosystem from '../../ecosystem.js'
import { parseImage } from './parser.js'
import { fetchTags } from './registry.js'
import { parseTag, findLatestTag } from './tags.js'
import { parse as parseYaml } from 'yaml'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import debug from '../../debug.js'

export default class DockerEcosystem extends Ecosystem {
  static get name () {
    return 'docker'
  }

  static get manifestFiles () {
    return ['compose.yml', 'docker-compose.yml']
  }

  async parse (cliArgs, filename = null) {
    // Read compose file
    const composeFile = filename || join(process.cwd(), 'compose.yml')

    try {
      const content = await readFile(composeFile, 'utf8')
      const compose = parseYaml(content)

      if (!compose.services) {
        return []
      }

      const dependencies = []

      // Extract images from services
      for (const [serviceName, service] of Object.entries(compose.services)) {
        if (service.image) {
          const parsed = parseImage(service.image)

          dependencies.push({
            type: 'image',
            name: parsed.name,
            version: parsed.tag,
            registry: parsed.registry,
            ecosystem: 'docker',
            service: serviceName
          })
        }
      }

      return dependencies
    } catch (error) {
      debug('error reading compose file: %s', error.message)
      throw new Error(`Failed to read ${composeFile}: ${error.message}`)
    }
  }

  async check (dependency) {
    const { type, name, version, registry } = dependency

    const versions = {
      type,
      name,
      current: version,
      ecosystem: 'docker',
      registry
    }

    debug('check > %s:%s [%s] from %s', name, version, type, registry)

    // Handle non-semver tags
    if (version.includes('sha256:')) {
      return Object.assign({ status: 'not-supported' }, versions)
    }

    const parsed = parseTag(version)
    if (!parsed) {
      // Tags like 'latest', 'stable' can't be checked
      return Object.assign({ status: 'not-supported' }, versions)
    }

    // Fetch available tags
    const tags = await fetchTags(registry, name)

    if (!tags) {
      return Object.assign({ status: 'not-found' }, versions)
    }

    debug('found > %s:%s found %d tags', name, version, tags.length)

    // Find latest matching tag
    const latest = findLatestTag(version, tags)

    if (!latest) {
      // Current version is latest
      return undefined
    }

    versions.oldest = version
    versions.latest = latest

    debug('found > %s:%s { oldest: %s latest: %s}', name, version, versions.oldest, versions.latest)

    return Object.assign({ status: 'outdated' }, versions)
  }

  async update (updates) {
    // TODO: Implement update logic (will update compose files with new tags)
    throw new Error('Update not yet implemented')
  }
}
