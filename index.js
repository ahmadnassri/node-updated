#!/usr/bin/env bun

/**
 * CLI Entry Point
 * Thin wrapper around Engine using CLI-specific input/output implementations
 */

// Process CLI arguments
import cliArguments from './lib/args.js'

// Load exception handlers
import './lib/uncaught.js'

// Core engine and configuration
import Config from './lib/core/config.js'
import Engine from './lib/core/engine.js'

// CLI-specific interfaces
import CLIInput from './lib/interfaces/cli/input.js'
import CLIOutput from './lib/interfaces/cli/output.js'

// Start timing
console.time('completed in')

// Create configuration from CLI arguments
let config
try {
  config = new Config(cliArguments)
} catch (error) {
  console.error('❌', error.message)
  process.exit(1)
}

// Create CLI-specific input/output interfaces
const input = new CLIInput(config)
const output = new CLIOutput(config)

// Create and execute engine
const engine = new Engine(config, input, output)

try {
  const result = await engine.execute()

  // Output JSON if requested
  if (config.json) {
    process.stdout.write(JSON.stringify(result.toJSON()))
  }

  // Show timing
  if (!config.silent) {
    console.timeEnd('completed in')
  }

  // Exit with appropriate code
  process.exit(result.exitCode)
} catch (error) {
  console.error('❌ Error:', error.message)

  if (!config.silent) {
    console.timeEnd('completed in')
  }

  process.exit(1)
}
