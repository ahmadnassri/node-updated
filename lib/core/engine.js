import Processor from './processor.js'
import Result from './result.js'
import { runInteractiveUpdate } from '../interactive.js'
import { buildSelectionState } from '../selection.js'
import NpmEcosystem from '../ecosystems/npm/index.js'
import DockerEcosystem from '../ecosystems/docker/index.js'

/**
 * Core Engine - orchestrates the entire update checking and updating process
 * Uses dependency injection for config, input, and output interfaces
 * Shared by both CLI and GitHub Action
 */
export default class Engine {
  constructor (config, input, output) {
    this.config = config
    this.input = input
    this.output = output
    this.processor = new Processor(config)
    this.result = new Result()
  }

  /**
   * Main execution method
   * Discovers ecosystems, processes them, handles updates
   * @returns {Promise<Result>} Final result object
   */
  async execute () {
    // Discover available ecosystems
    const ecosystems = await this.processor.discoverEcosystems()

    // Check if any ecosystems found
    if (!ecosystems.npm.available && !ecosystems.docker.available) {
      throw new Error('No package.json or compose files found in current directory')
    }

    // Process ecosystems
    await this.processEcosystems(ecosystems)

    // Handle updates if requested
    if (this.config.update) {
      await this.applyUpdates()
    }

    return this.result
  }

  /**
   * Process all available ecosystems
   * @param {Object} ecosystems - Discovered ecosystems
   */
  async processEcosystems (ecosystems) {
    const npmResults = []
    const dockerResults = []

    // Process npm ecosystem
    if (ecosystems.npm.available) {
      const results = await this.processor.processNpmWorkspaces(
        ecosystems.npm.locations,
        this.output
      )
      npmResults.push(...results)
    }

    // Process docker ecosystem
    if (ecosystems.docker.available) {
      const results = await this.processor.processDockerComposeFiles(
        ecosystems.docker.locations,
        this.output
      )
      dockerResults.push(...results)
    }

    // Aggregate all results
    const aggregated = this.processor.aggregateResults(npmResults, dockerResults)

    // Store in result object
    for (const exitCode of aggregated.exitCodes) {
      this.result.addExitCode(exitCode)
    }

    for (const data of aggregated.data) {
      this.result.addResult(data)
    }
  }

  /**
   * Apply updates to outdated packages/images
   * Handles both interactive and auto-update modes
   */
  async applyUpdates () {
    // Check for updates to apply
    const hasUpdates = this.result.data.some(d =>
      d.status === 'outdated' || d.status === 'deprecated'
    )

    if (!hasUpdates) {
      if (!this.config.silent && !this.config.json) {
        console.error('\nNo updates available')
      }
      return
    }

    // Interactive mode (CLI only)
    if (this.config.isInteractive() && this.input.isInteractive()) {
      await this.handleInteractiveUpdate()
    } else if (this.config.all) {
      // Auto-update mode
      await this.handleAutoUpdate()
    }
  }

  /**
   * Handle interactive update mode
   * Prompts user to select packages to update
   */
  async handleInteractiveUpdate () {
    // Check if we're in a TTY environment
    if (!process.stdin.isTTY || process.env.CI === 'true') {
      console.error('\n❌ Interactive mode requires a TTY')
      console.error('💡 Use --update --all for non-interactive mode, or run in a terminal')
      this.result.addExitCode(1)
      return
    }

    // Build selection state from results
    const state = buildSelectionState(this.result.data)

    // Run interactive update
    const interactiveResult = await runInteractiveUpdate(state, this.result.data)

    if (interactiveResult.cancelled) {
      console.error('\n❌ Cancelled by user. No changes made.')
      this.result.addExitCode(0)
      return
    }

    if (interactiveResult.error) {
      console.error('\n❌ Error during interactive update:', interactiveResult.error)
      this.result.addExitCode(1)
      return
    }

    if (interactiveResult.success) {
      console.error('\n✅ Updated successfully:')
      for (const update of interactiveResult.updated) {
        console.error(`  • ${update.location}: ${update.changes} package${update.changes !== 1 ? 's' : ''}`)
        this.result.markUpdated(update.location)
      }
      console.error('\n💡 Run \'npm install\' to update your lock file')
      this.result.addExitCode(0)
    }
  }

  /**
   * Handle auto-update mode
   * Updates all outdated packages without prompting
   */
  async handleAutoUpdate () {
    // Empty line
    if (!this.config.silent) {
      console.error()
    }

    // Group results by location
    const byLocation = this.groupResultsByLocation()

    // Update each location
    for (const [location, items] of Object.entries(byLocation)) {
      await this.updateLocation(location, items)
    }

    // Don't fail on auto-update (set exitCode to 0)
    this.result.exitCodes = this.result.exitCodes.map(() => 0)
  }

  /**
   * Group results by location (package.json or compose file path)
   * @returns {Object} Results grouped by file location
   */
  groupResultsByLocation () {
    const grouped = {}

    for (const item of this.result.data) {
      // Skip items that can't be updated
      if (item.status !== 'outdated' && item.status !== 'deprecated') {
        continue
      }

      // Determine location
      let location
      if (item.ecosystem === 'npm') {
        location = this.getPackageJsonPath(item.workspace)
      } else if (item.ecosystem === 'docker') {
        location = item.file
      } else {
        continue
      }

      if (!grouped[location]) {
        grouped[location] = []
      }

      grouped[location].push(item)
    }

    return grouped
  }

  /**
   * Get package.json path from workspace name
   * @param {String} workspace - Workspace name
   * @returns {String} Full path to package.json
   */
  getPackageJsonPath (workspace) {
    if (workspace === 'root' || !workspace) {
      return process.cwd() + '/package.json'
    }
    return process.cwd() + '/' + workspace + '/package.json'
  }

  /**
   * Update a specific location (package.json or compose file)
   * @param {String} location - File path
   * @param {Array} items - Items to update
   */
  async updateLocation (location, items) {
    // Determine ecosystem
    const ecosystem = items[0].ecosystem
    let ecosystemInstance

    if (ecosystem === 'npm') {
      ecosystemInstance = new NpmEcosystem()
    } else if (ecosystem === 'docker') {
      ecosystemInstance = new DockerEcosystem()
    } else {
      return
    }

    // Prepare updates array
    const updates = items
      .filter(item => item.status === 'outdated' && item.latest)
      .map(item => ({
        name: item.name,
        type: item.type,
        current: item.current,
        latest: item.latest,
        action: 'update'
      }))

    // Add deprecated items for removal
    const deprecated = items
      .filter(item => item.status === 'deprecated')
      .map(item => ({
        name: item.name,
        type: item.type,
        current: item.current,
        action: 'remove'
      }))

    const allUpdates = [...updates, ...deprecated]

    if (allUpdates.length === 0) {
      if (!this.config.silent) {
        console.error(`No updates needed for ${location}`)
      }
      return
    }

    // Apply updates via ecosystem
    try {
      await ecosystemInstance.update(location, allUpdates)
      this.result.markUpdated(location)

      if (!this.config.silent) {
        console.error(`✅ Updated ${location}: ${allUpdates.length} package${allUpdates.length !== 1 ? 's' : ''}`)

        if (ecosystem === 'npm') {
          console.error('💡 Run \'npm install\' to update your lock file')
        }
      }
    } catch (error) {
      console.error(`❌ Failed to update ${location}:`, error.message)
      this.result.addExitCode(1)
    }
  }
}
