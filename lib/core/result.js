/**
 * Result data structure for ecosystem checks
 * Aggregates results from all ecosystems and provides utilities
 * Used by both CLI and GitHub Action for result handling
 */
export default class Result {
  constructor () {
    this.data = []
    this.exitCodes = []
    this.updated = false
    this.updatedFiles = []
  }

  /**
   * Add a result from ecosystem check
   * @param {Object} item - Result object from ecosystem.check()
   */
  addResult (item) {
    if (item) {
      this.data.push(item)
    }
  }

  /**
   * Add an exit code from ecosystem processing
   * @param {Number} code - Exit code (0 or 1)
   */
  addExitCode (code) {
    this.exitCodes.push(Number(code))
  }

  /**
   * Mark that files were updated
   * @param {String} filepath - Path to updated file
   */
  markUpdated (filepath) {
    this.updated = true
    if (filepath && !this.updatedFiles.includes(filepath)) {
      this.updatedFiles.push(filepath)
    }
  }

  /**
   * Get count of outdated packages/images
   * @returns {Number} Count of outdated items
   */
  get outdatedCount () {
    return this.data.filter(item =>
      item.status === 'outdated' || item.status === 'deprecated'
    ).length
  }

  /**
   * Get count of deprecated packages
   * @returns {Number} Count of deprecated items
   */
  get deprecatedCount () {
    return this.data.filter(item => item.status === 'deprecated').length
  }

  /**
   * Check if there are any errors (outdated or deprecated items)
   * @returns {Boolean} True if errors exist
   */
  hasErrors () {
    return this.outdatedCount > 0
  }

  /**
   * Calculate exit code based on all ecosystem exit codes
   * Returns maximum exit code (0 if all passed, 1 if any failed)
   * @returns {Number} Exit code (0 or 1)
   */
  get exitCode () {
    if (this.exitCodes.length === 0) return 1 // No ecosystems processed
    return Math.max(...this.exitCodes, 0)
  }

  /**
   * Get results grouped by ecosystem
   * @returns {Object} Results grouped by ecosystem type
   */
  groupByEcosystem () {
    const groups = {
      npm: [],
      docker: []
    }

    for (const item of this.data) {
      const ecosystem = item.ecosystem || 'npm'
      if (groups[ecosystem]) {
        groups[ecosystem].push(item)
      }
    }

    return groups
  }

  /**
   * Get results grouped by status
   * @returns {Object} Results grouped by status
   */
  groupByStatus () {
    const groups = {
      outdated: [],
      deprecated: [],
      updated: [],
      'not-supported': [],
      'not-found': [],
      error: []
    }

    for (const item of this.data) {
      const status = item.status || 'error'
      if (groups[status]) {
        groups[status].push(item)
      }
    }

    return groups
  }

  /**
   * Get results filtered by ecosystem and status
   * @param {String} ecosystem - Ecosystem type ('npm' or 'docker')
   * @param {String} status - Status to filter by
   * @returns {Array} Filtered results
   */
  filter (ecosystem = null, status = null) {
    let filtered = [...this.data]

    if (ecosystem) {
      filtered = filtered.filter(item => item.ecosystem === ecosystem)
    }

    if (status) {
      filtered = filtered.filter(item => item.status === status)
    }

    return filtered
  }

  /**
   * Convert to JSON for Action output
   * Includes all data and metadata
   * @returns {Object} JSON-serializable object
   */
  toJSON () {
    return {
      outdatedCount: this.outdatedCount,
      deprecatedCount: this.deprecatedCount,
      updated: this.updated,
      updatedFiles: this.updatedFiles,
      exitCode: this.exitCode,
      data: this.data.map(item => ({
        ...item,
        // Ensure all fields are serializable
        ecosystem: item.ecosystem || 'npm',
        status: item.status,
        name: item.name,
        current: item.current,
        latest: item.latest || null,
        type: item.type || null,
        workspace: item.workspace || null,
        service: item.service || null,
        file: item.file || null
      }))
    }
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary object
   */
  getSummary () {
    const byEcosystem = this.groupByEcosystem()
    const byStatus = this.groupByStatus()

    return {
      total: this.data.length,
      outdated: this.outdatedCount,
      deprecated: this.deprecatedCount,
      updated: this.updated,
      updatedFiles: this.updatedFiles.length,
      ecosystems: {
        npm: byEcosystem.npm.length,
        docker: byEcosystem.docker.length
      },
      statuses: {
        outdated: byStatus.outdated.length,
        deprecated: byStatus.deprecated.length,
        updated: byStatus.updated.length,
        'not-supported': byStatus['not-supported'].length,
        'not-found': byStatus['not-found'].length,
        error: byStatus.error.length
      }
    }
  }

  /**
   * Check if result is empty (no data)
   * @returns {Boolean} True if no results
   */
  isEmpty () {
    return this.data.length === 0
  }

  /**
   * Merge another Result into this one
   * @param {Result} other - Another Result object
   */
  merge (other) {
    if (!(other instanceof Result)) {
      throw new Error('Can only merge Result instances')
    }

    this.data.push(...other.data)
    this.exitCodes.push(...other.exitCodes)

    if (other.updated) {
      this.updated = true
      this.updatedFiles.push(...other.updatedFiles)
    }
  }
}
