import { join } from 'node:path'
import NpmEcosystem from '../ecosystems/npm/index.js'
import DockerEcosystem from '../ecosystems/docker/index.js'

/**
 * Ecosystem processor - discovers and processes npm/docker ecosystems
 * Handles workspace iteration and compose file discovery
 */
export default class Processor {
  constructor (config) {
    this.config = config
    this.cwd = process.cwd()
  }

  /**
   * Discover which ecosystems are available
   * Checks for package.json and compose files
   * @returns {Promise<Object>} Available ecosystems
   */
  async discoverEcosystems () {
    const ecosystems = {
      npm: { available: false, locations: [] },
      docker: { available: false, locations: [] }
    }

    // Check for package.json
    const packageJsonPath = join(this.cwd, 'package.json')
    const hasPackageJson = await Bun.file(packageJsonPath).exists()

    if (hasPackageJson) {
      ecosystems.npm.available = true

      // Check for workspaces
      if (this.config.workspaces) {
        const rootPackage = await Bun.file(packageJsonPath).json()
        const workspaces = rootPackage.workspaces || []

        // Add root and all workspaces
        ecosystems.npm.locations = ['.', ...workspaces].map(ws =>
          ws === '.' ? packageJsonPath : join(this.cwd, ws, 'package.json')
        )
      } else {
        ecosystems.npm.locations = [packageJsonPath]
      }
    }

    // Check for Docker compose files
    const composeFiles = ['compose.yml', 'docker-compose.yml']
    for (const composeFile of composeFiles) {
      const composePath = join(this.cwd, composeFile)
      if (await Bun.file(composePath).exists()) {
        ecosystems.docker.available = true
        ecosystems.docker.locations.push(composePath)
        break // Only use first found compose file
      }
    }

    return ecosystems
  }

  /**
   * Process all npm workspaces
   * @param {Array} locations - Array of package.json paths
   * @param {Object} output - Output interface
   * @returns {Promise<Array>} Array of results
   */
  async processNpmWorkspaces (locations, output) {
    const ecosystem = new NpmEcosystem()
    const allResults = []

    for (const location of locations) {
      // Determine workspace name for display
      const workspace = this.getWorkspaceName(location)

      if (!this.config.json && !this.config.silent) {
        console.log('processing workspace:', workspace === 'root' ? 'root' : workspace)
      }

      try {
        // Parse dependencies
        const dependencies = await ecosystem.parse(this.config, location)

        // Create section
        const gridTitle = workspace === 'root'
          ? '📦 npm Packages (root)'
          : workspace
            ? `📦 npm Packages (${workspace})`
            : '📦 npm Packages'

        output.startSection(gridTitle)

        let exitCode = false
        const results = []

        // Check each dependency
        for (const dependency of dependencies) {
          const result = await ecosystem.check(dependency)

          if (!result) continue

          // Add workspace info
          const enrichedResult = { ...result, workspace, ecosystem: 'npm' }
          results.push(enrichedResult)

          // Report to output
          output.report(enrichedResult)

          // Set exit code if not supported
          if (result.status !== 'not-supported') {
            exitCode = true
          }
        }

        output.endSection()
        allResults.push({ exitCode, data: results })

      } catch (error) {
        console.error(`Error processing ${location}:`, error.message)
        allResults.push({ exitCode: true, data: [] })
      }
    }

    return allResults
  }

  /**
   * Process Docker compose files
   * @param {Array} locations - Array of compose file paths
   * @param {Object} output - Output interface
   * @returns {Promise<Array>} Array of results
   */
  async processDockerComposeFiles (locations, output) {
    const ecosystem = new DockerEcosystem()
    const allResults = []

    for (const location of locations) {
      const composeFile = location.split('/').pop() // Get filename

      try {
        // Parse dependencies
        const dependencies = await ecosystem.parse(this.config, location)

        if (dependencies.length === 0) continue

        // Create section
        const dockerTitle = `🐋 Docker Images (${composeFile})`
        output.startSection(dockerTitle)

        let exitCode = false
        const results = []

        // Check each dependency
        for (const dependency of dependencies) {
          const result = await ecosystem.check(dependency)

          if (!result) continue

          // Add file info
          const enrichedResult = { ...result, file: composeFile, ecosystem: 'docker' }
          results.push(enrichedResult)

          // Report to output
          output.report(enrichedResult)

          // Set exit code if not supported
          if (result.status !== 'not-supported') {
            exitCode = true
          }
        }

        output.endSection()
        allResults.push({ exitCode, data: results })

      } catch (error) {
        // Compose file doesn't exist or can't be read, skip
        continue
      }
    }

    return allResults
  }

  /**
   * Get workspace name from package.json path
   * @param {String} filepath - Path to package.json
   * @returns {String} Workspace name
   */
  getWorkspaceName (filepath) {
    const relativePath = filepath.replace(this.cwd, '').replace(/^\//, '')

    if (relativePath === 'package.json') {
      return 'root'
    }

    // Extract workspace name (e.g., "packages/foo/package.json" -> "packages/foo")
    return relativePath.replace('/package.json', '')
  }

  /**
   * Aggregate results from all ecosystems
   * @param {Array} npmResults - Results from npm processing
   * @param {Array} dockerResults - Results from docker processing
   * @returns {Object} Aggregated results with exitCodes and data
   */
  aggregateResults (npmResults, dockerResults) {
    const exitCodes = []
    const data = []

    // Aggregate npm results
    for (const result of npmResults) {
      exitCodes.push(Number(result.exitCode))
      data.push(...result.data)
    }

    // Aggregate docker results
    for (const result of dockerResults) {
      exitCodes.push(Number(result.exitCode))
      data.push(...result.data)
    }

    return { exitCodes, data }
  }
}
