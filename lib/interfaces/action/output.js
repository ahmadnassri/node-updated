import Output from '../output.js'

/**
 * GitHub Action Output implementation
 * Uses @actions/core for annotations, outputs, and grouping
 * Provides rich feedback in GitHub UI with file locations
 */
export default class ActionOutput extends Output {
  constructor () {
    super()
    // Note: @actions/core will be imported dynamically or injected
    // to avoid requiring it in CLI context
    this.core = null
    this.currentSection = null
    this.sectionResults = []
  }

  /**
   * Initialize with @actions/core module
   * @param {Object} core - @actions/core module
   */
  initialize (core) {
    this.core = core
  }

  /**
   * Ensure core is initialized
   */
  ensureCore () {
    if (!this.core) {
      // Lazy load @actions/core
      try {
        this.core = require('@actions/core')
      } catch (error) {
        throw new Error('@actions/core not available. Are you running in a GitHub Action?')
      }
    }
  }

  /**
   * Start a new section/group
   * @param {String} title - Section title
   */
  startSection (title) {
    this.ensureCore()
    this.currentSection = title
    this.sectionResults = []
    this.core.startGroup(title)
  }

  /**
   * Report a single result
   * Accumulates results for annotation at section end
   * @param {Object} result - Result object
   */
  report (result) {
    this.ensureCore()
    this.sectionResults.push(result)

    // Log to console for action logs
    const { status, name, current, latest } = result
    const message = latest
      ? `${name}: ${current} → ${latest} (${status})`
      : `${name}: ${current} (${status})`

    this.core.info(message)
  }

  /**
   * End section and create annotations
   */
  endSection () {
    this.ensureCore()

    // Create annotations for outdated/deprecated items
    for (const result of this.sectionResults) {
      this.createAnnotation(result)
    }

    this.core.endGroup()
    this.currentSection = null
    this.sectionResults = []
  }

  /**
   * Create annotation for a result
   * @param {Object} result - Result object
   */
  createAnnotation (result) {
    const { status, name, current, latest, ecosystem, workspace, file } = result

    // Only annotate actionable items
    if (status !== 'outdated' && status !== 'deprecated') {
      return
    }

    // Determine file path
    let filepath = 'package.json'
    if (ecosystem === 'npm' && workspace && workspace !== 'root') {
      filepath = `${workspace}/package.json`
    } else if (ecosystem === 'docker' && file) {
      filepath = file
    }

    // Create message
    let message
    if (status === 'outdated') {
      message = `${name} is outdated: ${current} → ${latest} available`
    } else if (status === 'deprecated') {
      message = `${name} is deprecated and should be removed`
    }

    // Create warning annotation
    this.core.warning(message, {
      file: filepath,
      title: `${ecosystem === 'docker' ? 'Docker' : 'npm'}: ${name} ${status}`
    })
  }

  /**
   * Add a custom annotation
   * @param {String} type - Annotation type (error, warning, notice)
   * @param {String} message - Annotation message
   * @param {String} file - File path
   * @param {Number} line - Line number (optional)
   */
  annotate (type, message, file, line = null) {
    this.ensureCore()

    const options = { file }
    if (line) options.startLine = line

    switch (type) {
      case 'error':
        this.core.error(message, options)
        break
      case 'warning':
        this.core.warning(message, options)
        break
      case 'notice':
        this.core.notice(message, options)
        break
      default:
        this.core.info(message)
    }
  }

  /**
   * Set an action output
   * @param {String} key - Output key
   * @param {*} value - Output value
   */
  setOutput (key, value) {
    this.ensureCore()

    // Stringify objects/arrays
    const outputValue = typeof value === 'object'
      ? JSON.stringify(value)
      : String(value)

    this.core.setOutput(key, outputValue)
  }

  /**
   * Finish output and set final outputs
   * @param {Object} summary - Summary statistics
   */
  finish (summary) {
    this.ensureCore()

    // Set summary outputs
    this.setOutput('outdated-count', summary.outdated || 0)
    this.setOutput('deprecated-count', summary.deprecated || 0)
    this.setOutput('updated', summary.updated || false)

    // Set full report as JSON
    if (summary.data) {
      this.setOutput('report', summary.data)
    }

    // Log summary
    this.core.info(`\nSummary: ${summary.outdated || 0} outdated, ${summary.deprecated || 0} deprecated`)

    if (summary.updated) {
      this.core.notice('Files updated successfully', {
        title: 'Dependencies Updated'
      })
    }
  }
}
