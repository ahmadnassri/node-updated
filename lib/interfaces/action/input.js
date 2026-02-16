/**
 * GitHub Action Input wrapper
 * Reads inputs from GitHub Action environment
 * Never supports interactive mode
 */
export default class ActionInput {
  constructor (config) {
    this.config = config
  }

  /**
   * Check if interactive mode is available
   * Always false for GitHub Actions
   * @returns {Boolean} Always false
   */
  isInteractive () {
    return false
  }

  /**
   * Get configuration
   * @returns {Config} Configuration object
   */
  getConfig () {
    return this.config
  }
}
