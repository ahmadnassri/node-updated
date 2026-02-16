/**
 * Parse .npmrc content into configuration object
 * @param {string} content - .npmrc file content
 * @returns {Promise<Object>} Parsed configuration
 */
export async function parseNpmrc(content) {
  const config = {
    registry: 'https://registry.npmjs.org',
    authTokens: {},
    scopedRegistries: {}
  }

  if (!content) return config

  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue
    }

    // Parse key=value
    const [key, ...valueParts] = trimmed.split('=')
    const value = valueParts.join('=').trim()

    if (!value) continue

    // Default registry
    if (key === 'registry') {
      config.registry = value
    }
    // Auth token
    else if (key.startsWith('//') && key.endsWith(':_authToken')) {
      // Extract registry URL between // and /:_authToken
      let registryUrl = key.slice(2, key.length - 11) // Remove // prefix and :_authToken suffix
      // Remove trailing slash if present
      if (registryUrl.endsWith('/')) {
        registryUrl = registryUrl.slice(0, -1)
      }
      config.authTokens[registryUrl] = value
    }
    // Scoped registry
    else if (key.startsWith('@') && key.endsWith(':registry')) {
      const scope = key.slice(0, -9) // Remove :registry
      config.scopedRegistries[scope] = value
    }
  }

  return config
}

/**
 * Build registry URL for a package
 * @param {string} packageName - Package name (may be scoped like @org/package)
 * @param {string|null} version - Package version or null for latest
 * @param {Object} config - Parsed .npmrc config
 * @returns {string} Full registry URL
 */
export function buildRegistryUrl(packageName, version, config) {
  // Determine which registry to use
  let registry = config.registry

  // Check if this is a scoped package
  if (packageName.startsWith('@')) {
    const scope = packageName.split('/')[0]
    if (config.scopedRegistries[scope]) {
      registry = config.scopedRegistries[scope]
    }
  }

  // Remove trailing slash from registry
  registry = registry.replace(/\/$/, '')

  // Build URL
  let url = `${registry}/${packageName}`
  if (version) {
    url += `/${version}`
  }

  return url
}
