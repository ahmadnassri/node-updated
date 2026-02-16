/**
 * Abstract Output interface
 * Defines the contract for output handling in both CLI and GitHub Action
 * Implementations must provide all methods
 */
export default class Output {
  /**
   * Start a new section/group for results
   * @param {String} title - Section title (e.g., "📦 npm Packages (root)")
   */
  startSection (title) {
    throw new Error('startSection() must be implemented by subclass')
  }

  /**
   * Report a single result (package/image check result)
   * @param {Object} result - Result object from ecosystem.check()
   * @param {String} result.status - Status (outdated, deprecated, updated, etc.)
   * @param {String} result.name - Package/image name
   * @param {String} result.current - Current version/tag
   * @param {String} result.latest - Latest version/tag (if available)
   * @param {String} result.type - Dependency type (for npm)
   * @param {String} result.ecosystem - Ecosystem type (npm, docker)
   */
  report (result) {
    throw new Error('report() must be implemented by subclass')
  }

  /**
   * End the current section
   * Triggers rendering for CLI (grid.render()) or grouping for Action
   */
  endSection () {
    throw new Error('endSection() must be implemented by subclass')
  }

  /**
   * Add an annotation (file-specific feedback)
   * Used by GitHub Action to add warnings/errors to specific files
   * No-op for CLI
   * @param {String} type - Annotation type (error, warning, notice)
   * @param {String} message - Annotation message
   * @param {String} file - File path
   * @param {Number} line - Line number (optional)
   */
  annotate (type, message, file, line = null) {
    throw new Error('annotate() must be implemented by subclass')
  }

  /**
   * Set an output value
   * Used by GitHub Action to set action outputs
   * No-op for CLI
   * @param {String} key - Output key
   * @param {*} value - Output value
   */
  setOutput (key, value) {
    throw new Error('setOutput() must be implemented by subclass')
  }

  /**
   * Finish output and display summary
   * Called at the end of execution
   * @param {Object} summary - Summary statistics
   */
  finish (summary) {
    throw new Error('finish() must be implemented by subclass')
  }
}
