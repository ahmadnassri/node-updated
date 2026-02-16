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
