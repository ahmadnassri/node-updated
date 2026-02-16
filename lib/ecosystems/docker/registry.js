import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Read Docker authentication config from ~/.docker/config.json
 * @param {string} registry - Registry hostname
 * @returns {Promise<string|null>} Base64 encoded auth string or null
 */
async function getDockerAuth (registry) {
  try {
    const configPath = join(homedir(), '.docker', 'config.json')
    const config = JSON.parse(await readFile(configPath, 'utf8'))

    // Docker Hub uses special key
    const registryKey = registry === 'docker.io'
      ? 'https://index.docker.io/v1/'
      : registry

    const auth = config.auths?.[registryKey]?.auth
    return auth || null
  } catch {
    return null // No config file or no auth
  }
}

/**
 * Get bearer token for Docker Hub
 * @param {string} name - Image name
 * @returns {Promise<string|null>} Bearer token or null
 */
async function getDockerHubToken (name) {
  try {
    const tokenUrl = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${name}:pull`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(tokenUrl, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.token || null
  } catch {
    return null
  }
}

/**
 * Fetch available tags for a Docker image from a registry
 * @param {string} registry - Registry hostname (e.g., 'docker.io', 'ghcr.io')
 * @param {string} name - Image name (e.g., 'library/nginx', 'owner/app')
 * @returns {Promise<Array<string>|null>} Array of tag names or null if not found
 */
export async function fetchTags (registry, name) {
  // Docker Hub uses registry-1.docker.io for API
  const actualRegistry = registry === 'docker.io' ? 'registry-1.docker.io' : registry
  const apiUrl = `https://${actualRegistry}/v2/${name}/tags/list`

  const headers = {}

  // Docker Hub requires bearer token authentication
  if (registry === 'docker.io') {
    const token = await getDockerHubToken(name)
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  } else {
    // Other registries may use basic auth from docker config
    const auth = await getDockerAuth(registry)
    if (auth) {
      headers.Authorization = `Basic ${auth}`
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(apiUrl, { headers, signal: controller.signal })
    clearTimeout(timeoutId)

    if (response.status === 404) {
      return null // Image not found
    }

    if (!response.ok) {
      throw new Error(`Registry returned ${response.status}`)
    }

    const data = await response.json()
    return data.tags || []
  } catch (error) {
    // Network errors, invalid JSON, etc.
    return null
  }
}
