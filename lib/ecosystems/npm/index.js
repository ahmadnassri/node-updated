import Ecosystem from '../../ecosystem.js'
import parse from './parser.js'
import queryRegistry from './registry.js'
import debug from '../../debug.js'

export default class NpmEcosystem extends Ecosystem {
  static get name () {
    return 'npm'
  }

  static get manifestFiles () {
    return ['package.json']
  }

  async parse (cliArgs) {
    // Read package.json from current working directory
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')

    const filename = join(process.cwd(), 'package.json')

    try {
      const content = await readFile(filename, 'utf8')
      const packageJson = JSON.parse(content)
      return parse(packageJson, cliArgs)
    } catch (error) {
      debug('error reading package.json: %s', error.message)
      throw new Error(`Failed to read package.json: ${error.message}`)
    }
  }

  async check (dependency) {
    const { type, name, version } = dependency

    const versions = {
      type,
      name,
      current: version,
      ecosystem: 'npm'
    }

    debug('check > %s@%s [%s]', name, version, type)

    // Simple test for urls and github variants
    if (version.includes(':') || version.includes('/')) {
      return Object.assign({ status: 'not-supported' }, versions)
    }

    try {
      // Get current and latest info
      const data = await queryRegistry(name, version)

      if (!data) {
        return Object.assign({ status: 'not-found' }, versions)
      }

      // NOTE: data will be an array when using a range for version
      debug('found > %s@%s found %d results', name, version, Array.isArray(data) ? data.length : 1)

      // Results are returned in historical order, the last is the one directly matching our query
      const oldest = Array.isArray(data) ? data[0] : data
      const latest = Array.isArray(data) ? data[data.length - 1] : data

      versions.oldest = oldest.version
      versions.latest = latest['dist-tags'].latest

      debug('found > %s@%s { oldest: %s latest: %s}', name, version, versions.oldest, versions.latest)

      let status = false

      if (latest.deprecated) {
        status = 'deprecated'
      }

      // Really the whole point of this package is here
      if (!status && versions.oldest !== versions.latest) {
        status = 'outdated'
      }

      // Only return a result if there's something actionable
      if (status) {
        debug('result > %s@%s %s', name, version, status)
        return Object.assign({ status }, versions)
      }
    } catch (error) {
      debug('error checking %s@%s: %s', name, version, error.message)
      return Object.assign({ status: 'error', error: error.message }, versions)
    }
  }

  async update (updates) {
    // TODO: Implement update logic (will be moved from index.js)
    throw new Error('Update not yet implemented')
  }
}
