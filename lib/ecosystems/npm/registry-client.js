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

/**
 * Custom error for 404 responses
 */
export class NotFoundError extends Error {
  constructor(message = 'Package not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

/**
 * Custom error for auth failures
 */
export class AuthError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Fetch package info from npm registry
 * @param {string} url - Full registry URL
 * @param {string|null} authToken - Optional auth token
 * @returns {Promise<Object>} Package data from registry
 */
export async function fetchRegistry(url, authToken) {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'updated (https://github.com/ahmadnassri/node-updated)'
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    if (response.status === 404) {
      throw new NotFoundError(`Package not found at ${url}`)
    }
    if (response.status === 401 || response.status === 403) {
      throw new AuthError('Authentication required for this registry')
    }
    throw new Error(`Registry error: ${response.statusText}`)
  }

  return response.json()
}

import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

/**
 * Read .npmrc files from all locations
 * @returns {Promise<Object>} Merged configuration
 */
async function readNpmrcFiles() {
  const locations = [
    '/etc/npmrc',
    join(homedir(), '.npmrc'),
    join(process.cwd(), '.npmrc')
  ]

  let mergedConfig = {
    registry: 'https://registry.npmjs.org',
    authTokens: {},
    scopedRegistries: {}
  }

  for (const location of locations) {
    try {
      if (existsSync(location)) {
        const content = await Bun.file(location).text()
        const config = await parseNpmrc(content)

        // Merge configs (later configs override earlier ones)
        mergedConfig = {
          registry: config.registry || mergedConfig.registry,
          authTokens: { ...mergedConfig.authTokens, ...config.authTokens },
          scopedRegistries: { ...mergedConfig.scopedRegistries, ...config.scopedRegistries }
        }
      }
    } catch (error) {
      // Ignore errors reading config files
    }
  }

  return mergedConfig
}

/**
 * Query npm registry for package information
 * @param {string} packageName - Package name
 * @param {string} version - Version or version range
 * @returns {Promise<Object|null>} Package data or null if not found
 */
export async function queryRegistry(packageName, version) {
  try {
    // Read .npmrc configuration
    const config = await readNpmrcFiles()

    // Build registry URL
    const url = buildRegistryUrl(packageName, version, config)

    // Determine auth token
    let authToken = null
    if (packageName.startsWith('@')) {
      const scope = packageName.split('/')[0]
      const registry = config.scopedRegistries[scope] || config.registry
      const registryHost = new URL(registry).host
      authToken = config.authTokens[registryHost]
    } else {
      const registryHost = new URL(config.registry).host
      authToken = config.authTokens[registryHost]
    }

    // Fetch from registry
    const data = await fetchRegistry(url, authToken)
    return data
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null
    }
    throw error
  }
}
