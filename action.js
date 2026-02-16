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
import PRCreator from './lib/interfaces/action/pr-creator.js'
import Commenter from './lib/interfaces/action/commenter.js'

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
    if (result.updated && token) {
      const prCreator = new PRCreator(token)

      try {
        if (createPr) {
          // Create PR with updated files
          core.info('Creating pull request with updated dependencies...')

          // Get list of updated files from result
          const updatedFiles = result.updatedFiles || []
          const baseBranch = github.context.ref.replace('refs/heads/', '')

          const prResult = await prCreator.createUpdatePR(
            updatedFiles,
            result.data,
            baseBranch
          )

          core.info(`✅ Pull request created: ${prResult.pr.url}`)
          core.setOutput('pr-number', prResult.pr.number)
          core.setOutput('pr-url', prResult.pr.url)
        } else if (commitDirectly) {
          // Commit directly to current branch
          core.info('Committing updates directly to current branch...')

          const updatedFiles = result.updatedFiles || []
          const branchName = github.context.ref.replace('refs/heads/', '')
          const commitMessage = 'chore: update dependencies\n\nCo-Authored-By: Updated Bot <noreply@github.com>'

          await prCreator.commitFiles(branchName, updatedFiles, commitMessage)

          core.info('✅ Changes committed successfully')
        }
      } catch (error) {
        core.error(`GitHub integration failed: ${error.message}`)
        // Don't fail the action, just warn
        core.warning('Could not create PR/commit. Check token permissions and branch protection rules.')
      }
    }

    // Add PR comment (independent of update/PR creation)
    if (addComment && token && github.context.payload.pull_request) {
      const commenter = new Commenter(token)

      try {
        core.info('Adding dependency report comment to PR...')

        const commentResult = await commenter.addReportComment(
          result.data,
          summary
        )

        core.info(`✅ Comment ${commentResult.updated ? 'updated' : 'added'}: ${commentResult.url}`)
      } catch (error) {
        core.error(`Failed to add comment: ${error.message}`)
        core.warning('Could not add PR comment. Check token permissions.')
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
