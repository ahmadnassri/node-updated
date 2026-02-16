#!/usr/bin/env node

/**
 * GitHub Action Entry Point
 * Wraps Engine with Action-specific input/output implementations
 * Supports: report with annotations, auto-update, PR creation, commits, comments
 */

import * as core from '@actions/core'
import * as github from '@actions/github'

// Core engine and configuration
import Config from './lib/core/config.js'
import Engine from './lib/core/engine.js'

// Action-specific interfaces
import ActionInput from './lib/interfaces/action/input.js'
import ActionOutput from './lib/interfaces/action/output.js'

/**
 * Main action execution
 */
async function run () {
  try {
    // Read inputs from action.yml
    const inputs = {
      update: core.getBooleanInput('update'),
      all: true, // Actions always use auto-update mode (no interactive)
      types: core.getInput('types') || 'dependencies,devDependencies,optionalDependencies',
      scopes: core.getInput('scopes') || '',
      ignore: core.getInput('ignore') || '',
      workspaces: core.getBooleanInput('workspaces'),
      json: false, // Actions use structured outputs, not JSON
      silent: false, // Actions should log
      'no-color': true // GitHub Actions strip colors anyway
    }

    // GitHub-specific inputs (for later use in PR/commit features)
    const token = core.getInput('token')
    const createPr = core.getBooleanInput('create-pr')
    const commitDirectly = core.getBooleanInput('commit-directly')
    const addComment = core.getBooleanInput('add-comment')

    // Validate mutually exclusive options
    if (createPr && commitDirectly) {
      throw new Error('Cannot use both create-pr and commit-directly')
    }

    if ((createPr || commitDirectly || addComment) && !inputs.update) {
      core.warning('PR/commit/comment features require update: true')
    }

    // Create configuration from inputs
    const config = new Config(inputs)

    // Create Action-specific input/output interfaces
    const input = new ActionInput(config)
    const output = new ActionOutput()

    // Initialize output with @actions/core
    output.initialize(core)

    // Create and execute engine
    core.info('Starting dependency check...')
    const engine = new Engine(config, input, output)
    const result = await engine.execute()

    // Set outputs
    const summary = result.getSummary()
    output.finish(summary)

    // GitHub integration features (PR creation, commits, comments)
    // These will be implemented in Tasks 15-17
    if (result.updated && token) {
      if (createPr) {
        core.info('PR creation will be implemented in Task 15')
        // TODO: Task 15 - Create PR via pr-creator.js
      } else if (commitDirectly) {
        core.info('Direct commit will be implemented in Task 15')
        // TODO: Task 15 - Commit directly via Octokit
      }

      if (addComment && github.context.payload.pull_request) {
        core.info('PR comment will be implemented in Task 16')
        // TODO: Task 16 - Add comment via commenter.js
      }
    }

    // Summary
    core.info(`✅ Check complete: ${summary.outdated || 0} outdated, ${summary.deprecated || 0} deprecated`)

    if (result.updated) {
      core.notice('Dependencies updated successfully')
    }

    // Exit code based on result
    if (result.exitCode !== 0) {
      core.setFailed(`Found ${summary.outdated || 0} outdated packages`)
    }
  } catch (error) {
    core.setFailed(error.message)
    process.exit(1)
  }
}

// Execute
run()
