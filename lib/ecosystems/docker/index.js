import Ecosystem from '../../ecosystem.js'
import { parseImage } from './parser.js'
import { fetchTags } from './registry.js'
import { parseTag, findLatestTag } from './tags.js'
import { parse as parseYaml } from 'yaml'
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
      const content = await Bun.file(composeFile).text()
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

  async update (filepath, updates) {
    // Read current compose file
    const content = await Bun.file(filepath).text()
    const compose = parseYaml(content)

    if (!compose.services) {
      throw new Error(`No services found in ${filepath}`)
    }

    // Apply each update
    for (const update of updates) {
      // Find the service that matches this update
      const service = Object.entries(compose.services).find(([name, svc]) => {
        if (!svc.image) return false
        const parsed = parseImage(svc.image)
        return parsed.name === update.name || name === update.service
      })

      if (service) {
        const [serviceName, serviceConfig] = service
        const parsed = parseImage(serviceConfig.image)

        // Update the image tag
        const newImage = `${parsed.registry ? parsed.registry + '/' : ''}${parsed.name}:${update.latest}`
        compose.services[serviceName].image = newImage

        debug('updated > %s service %s: %s -> %s', filepath, serviceName, update.current, update.latest)
      }
    }

    // Write back to file (preserve formatting as much as possible)
    const yaml = require('yaml')
    const newContent = yaml.stringify(compose, {
      lineWidth: 0, // Don't wrap lines
      indent: 2
    })

    await Bun.write(filepath, newContent)

    debug('updated > %s (%d changes)', filepath, updates.length)
  }
}
