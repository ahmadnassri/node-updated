/**
 * Unified configuration object for both CLI and GitHub Action
 * Accepts configuration from either CLI arguments or Action inputs
 * Normalizes and validates all input parameters
 */
export default class Config {
  constructor (options = {}) {
    // Boolean flags
    this.help = this.toBoolean(options.help, false)
    this.noColor = this.toBoolean(options['no-color'] || options.noColor, false)
    this.update = this.toBoolean(options.update, false)
    this.all = this.toBoolean(options.all, false)
    this.json = this.toBoolean(options.json, false)
    this.silent = this.toBoolean(options.silent, false)
    this.workspaces = this.toBoolean(options.workspaces, false)

    // GitHub Action specific flags
    this.createPr = this.toBoolean(options['create-pr'] || options.createPr, false)
    this.commitDirectly = this.toBoolean(options['commit-directly'] || options.commitDirectly, false)
    this.addComment = this.toBoolean(options['add-comment'] || options.addComment, false)

    // List options (can be arrays or CSV strings)
    this.types = this.toArray(options.types, ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'])
    this.scopes = this.toArray(options.scopes, [])
    this.ignore = this.toArray(options.ignore, [])

    // String options
    this.token = options.token || null

    // Validate configuration
    this.validate()
  }

  /**
   * Convert value to boolean
   * Handles string 'true'/'false' from Action inputs
   */
  toBoolean (value, defaultValue) {
    if (value === undefined || value === null) return defaultValue
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (lower === 'true') return true
      if (lower === 'false') return false
    }
    return Boolean(value)
  }

  /**
   * Convert value to array
   * Handles CSV strings from Action inputs or CLI args
   */
  toArray (value, defaultValue) {
    if (value === undefined || value === null) return defaultValue
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      // Split by comma and trim whitespace
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0)
    }
    return defaultValue
  }

  /**
   * Validate configuration combinations
   * Throws error for invalid combinations
   */
  validate () {
    // Interactive mode incompatible with json/silent
    if (this.update && !this.all) {
      if (this.json) {
        throw new Error('Cannot use --json with interactive --update mode. Use --update --all --json for non-interactive JSON output.')
      }
      if (this.silent) {
        throw new Error('Cannot use --silent with interactive --update mode. Use --update --all --silent for non-interactive mode.')
      }
    }

    // GitHub Action specific validations
    if (this.createPr && this.commitDirectly) {
      throw new Error('Cannot use both create-pr and commit-directly. Choose one update strategy.')
    }

    // Validate types
    const validTypes = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
    for (const type of this.types) {
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid dependency type: ${type}. Valid types: ${validTypes.join(', ')}`)
      }
    }
  }

  /**
   * Check if running in interactive mode
   * Interactive requires: --update without --all, and TTY available
   */
  isInteractive () {
    return this.update && !this.all
  }

  /**
   * Get configuration as plain object
   * Useful for serialization and debugging
   */
  toObject () {
    return {
      help: this.help,
      noColor: this.noColor,
      update: this.update,
      all: this.all,
      json: this.json,
      silent: this.silent,
      workspaces: this.workspaces,
      createPr: this.createPr,
      commitDirectly: this.commitDirectly,
      addComment: this.addComment,
      types: this.types,
      scopes: this.scopes,
      ignore: this.ignore,
      token: this.token ? '[REDACTED]' : null
    }
  }
}
