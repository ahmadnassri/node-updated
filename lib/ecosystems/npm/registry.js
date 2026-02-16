import { queryRegistry } from './registry-client.js'
import semver from 'semver'

/**
 * Query npm registry for package information
 * @param {string} packageName - Package name
 * @param {string} version - Version range
 * @returns {Promise<Array|undefined>} Array of matching versions or undefined
 */
export default async function queryNpmRegistry (packageName, version) {
  try {
    // Fetch packument from registry (without version to get all versions)
    const packument = await queryRegistry(packageName, null)

    // If package not found
    if (!packument) {
      return undefined
    }

    // If no version specified, return the packument
    if (!version) {
      return packument
    }

    // Get all versions that match the range/version
    const allVersions = Object.keys(packument.versions || {})
    const matchingVersions = []

    for (const v of allVersions) {
      // Use semver to check if version satisfies the range
      if (semver.satisfies(v, version)) {
        const versionData = packument.versions[v]
        // Add dist-tags to each version
        versionData['dist-tags'] = packument['dist-tags']
        matchingVersions.push(versionData)
      }
    }

    // If no versions match, return undefined (not found)
    if (matchingVersions.length === 0) {
      return undefined
    }

    // Return array sorted by version (oldest first, newest last)
    return matchingVersions.sort((a, b) => {
      return semver.compare(a.version, b.version)
    })
  } catch (error) {
    // Other errors should propagate
    throw error
  }
}
