import Output from '../output.js'
import Grid from '../../grid.js'
import { magenta, cyan, red, green, gray, light } from '../../colors.js'

/**
 * CLI Output implementation
 * Uses Grid for table rendering and colors for terminal output
 * Respects --silent, --json, and --no-color flags
 */
export default class CLIOutput extends Output {
  constructor (config) {
    super()
    this.config = config
    this.currentGrid = null
    this.currentSection = null
  }

  /**
   * Start a new section with Grid table
   * @param {String} title - Section title
   */
  startSection (title) {
    this.currentSection = title
    this.currentGrid = new Grid(title)
  }

  /**
   * Report a single result by adding row to Grid
   * @param {Object} result - Result object
   */
  report (result) {
    if (!this.currentGrid) {
      throw new Error('Must call startSection() before report()')
    }

    const { status, name, current, latest, ecosystem } = result

    // Status icons and formatting
    const statusIcons = {
      OUTDATED: '⚠️  ' + magenta('OUTDATED'),
      DEPRECATED: '🚨 ' + red('DEPRECATED'),
      UPDATED: '✅ ' + green('UPDATED'),
      'NOT-SUPPORTED': '❌ ' + red('NOT-SUPPORTED'),
      'NOT-FOUND': '🔍 ' + red('NOT-FOUND'),
      ERROR: '❌ ' + red('ERROR')
    }

    const statusUpper = status.toUpperCase()
    const statusDisplay = statusIcons[statusUpper] || magenta(statusUpper)

    // Format row based on ecosystem
    if (ecosystem === 'docker') {
      this.currentGrid.row([
        statusDisplay,
        `${name}${light(':')} ${gray(current)}`,
        latest ? `${cyan(current)} ${light('→')} ${green(latest)}` : gray('—')
      ])
    } else {
      // npm or default
      this.currentGrid.row([
        statusDisplay,
        `${name}${light(':')} ${gray(current)}`,
        latest ? `${cyan(current)} ${light('→')} ${green(latest)}` : gray('—')
      ])
    }
  }

  /**
   * End section and render Grid
   */
  endSection () {
    if (!this.currentGrid) {
      return
    }

    // Only render if not silent and not json and has rows
    if (!this.config.silent && !this.config.json && this.currentGrid.rows.length > 0) {
      this.currentGrid.render()
    }

    this.currentGrid = null
    this.currentSection = null
  }

  /**
   * Annotate - no-op for CLI
   * CLI doesn't support file annotations
   */
  annotate (type, message, file, line = null) {
    // No-op for CLI
  }

  /**
   * Set output - no-op for CLI
   * CLI doesn't have action outputs
   */
  setOutput (key, value) {
    // No-op for CLI
  }

  /**
   * Finish output
   * @param {Object} summary - Summary statistics
   */
  finish (summary) {
    // Summary is handled by engine and index.js
    // No additional action needed for CLI
  }
}
