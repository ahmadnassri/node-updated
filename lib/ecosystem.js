export default class Ecosystem {
  /**
   * Unique ecosystem identifier (e.g., 'npm', 'docker')
   * @returns {string}
   */
  static get name () {
    throw new Error('Must implement static getter: name')
  }

  /**
   * Manifest file patterns for auto-detection
   * @returns {string[]}
   */
  static get manifestFiles () {
    throw new Error('Must implement static getter: manifestFiles')
  }

  /**
   * Parse manifest file(s) and return dependencies
   * @param {Object} cliArgs - CLI arguments
   * @returns {Promise<Array>} Array of dependencies
   */
  async parse (cliArgs) {
    throw new Error('Must implement method: parse')
  }

  /**
   * Check a single dependency for updates
   * @param {Object} dependency - Dependency to check
   * @returns {Promise<Object>} Check result with status
   */
  async check (dependency) {
    throw new Error('Must implement method: check')
  }

  /**
   * Update manifest file(s) with new versions
   * @param {Array} updates - Array of updates to apply
   * @returns {Promise<void>}
   */
  async update (updates) {
    throw new Error('Must implement method: update')
  }
}
