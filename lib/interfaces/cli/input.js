/**
 * CLI Input wrapper
 * Handles interactive mode availability checking
 * Wraps CLI arguments and TTY detection
 */
export default class CLIInput {
  constructor (config) {
    this.config = config
  }

  /**
   * Check if interactive mode is available
   * Requires TTY and not in CI environment
   * @returns {Boolean} True if interactive mode available
   */
  isInteractive () {
    return this.config.isInteractive() &&
           process.stdin.isTTY &&
           process.env.CI !== 'true'
  }

  /**
   * Get configuration
   * @returns {Config} Configuration object
   */
  getConfig () {
    return this.config
  }
}
