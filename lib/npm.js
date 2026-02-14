import fetch from 'npm-registry-fetch'
import semver from 'semver'

export default async function npm (...args) {
  // Handle 'show' command - the only command we use
  if (args[0] === 'show' && args[1]) {
    const spec = args[1]

    try {
      // Parse package name and version from spec
      // spec format: 'package@version' or just 'package'
      let pkg, versionRange
      if (spec.includes('@') && !spec.startsWith('@')) {
        // Regular package with version: 'pkg@1.0.0' or 'pkg@^1.0.0'
        const parts = spec.split('@')
        pkg = parts[0]
        versionRange = parts[1]
      } else {
        // Scoped package or no version: '@scope/pkg' or 'pkg'
        pkg = spec
        versionRange = null
      }

      // Fetch packument from registry
      const packument = await fetch.json(`/${pkg}`)

      // If no version specified, return the packument
      if (!versionRange) {
        return packument
      }

      // Get all versions that match the range/version
      const allVersions = Object.keys(packument.versions || {})
      const matchingVersions = []

      for (const v of allVersions) {
        // Use semver to check if version satisfies the range
        if (semver.satisfies(v, versionRange)) {
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
      // 404 means package not found - return undefined
      if (error.statusCode === 404 || error.code === 'E404') {
        return undefined
      }

      // Other errors should propagate
      throw error
    }
  }

  // For any other args pattern, throw error
  throw new Error(`Unsupported npm command: ${args.join(' ')}`)
}
