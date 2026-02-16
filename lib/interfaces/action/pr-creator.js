import { Octokit } from '@actions/github'
import * as github from '@actions/github'

/**
 * PR Creator for GitHub Actions
 * Handles branch creation, commits, and PR creation
 */
export default class PRCreator {
  constructor (token) {
    this.octokit = new Octokit({ auth: token })
    this.context = github.context
  }

  /**
   * Create a new branch from the base branch
   * @param {String} branchName - Name of the new branch
   * @param {String} baseBranch - Base branch to branch from (default: current branch)
   * @returns {Promise<Object>} Branch creation result
   */
  async createBranch (branchName, baseBranch = null) {
    const { owner, repo } = this.context.repo
    const base = baseBranch || this.context.ref.replace('refs/heads/', '')

    try {
      // Get the base branch ref
      const { data: baseRef } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${base}`
      })

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.object.sha
      })

      return { success: true, branch: branchName, sha: baseRef.object.sha }
    } catch (error) {
      if (error.status === 422) {
        throw new Error(`Branch "${branchName}" already exists. Delete it first or use a different name.`)
      }
      throw new Error(`Failed to create branch: ${error.message}`)
    }
  }

  /**
   * Commit updated files to a branch
   * @param {String} branchName - Target branch name
   * @param {Array<String>} filePaths - Array of file paths that were updated
   * @param {String} message - Commit message
   * @returns {Promise<Object>} Commit result
   */
  async commitFiles (branchName, filePaths, message) {
    const { owner, repo } = this.context.repo

    try {
      // Get the current branch ref
      const { data: ref } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branchName}`
      })

      const currentCommitSha = ref.object.sha

      // Get the current commit
      const { data: currentCommit } = await this.octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha
      })

      const currentTreeSha = currentCommit.tree.sha

      // Read file contents and create blobs
      const blobs = []
      for (const filePath of filePaths) {
        const content = await Bun.file(filePath).text()
        const { data: blob } = await this.octokit.rest.git.createBlob({
          owner,
          repo,
          content,
          encoding: 'utf-8'
        })
        blobs.push({ path: filePath, sha: blob.sha })
      }

      // Create new tree
      const { data: newTree } = await this.octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree: blobs.map(blob => ({
          path: blob.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha
        }))
      })

      // Create new commit
      const { data: newCommit } = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.sha,
        parents: [currentCommitSha]
      })

      // Update branch ref
      await this.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
        sha: newCommit.sha
      })

      return { success: true, commit: newCommit.sha }
    } catch (error) {
      throw new Error(`Failed to commit files: ${error.message}`)
    }
  }

  /**
   * Create a pull request
   * @param {String} branchName - Source branch name
   * @param {String} baseBranch - Target branch name
   * @param {String} title - PR title
   * @param {String} body - PR body (markdown)
   * @param {Array<String>} labels - PR labels
   * @returns {Promise<Object>} PR creation result
   */
  async createPullRequest (branchName, baseBranch, title, body, labels = []) {
    const { owner, repo } = this.context.repo

    try {
      // Create PR
      const { data: pr } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title,
        head: branchName,
        base: baseBranch,
        body
      })

      // Add labels if provided
      if (labels.length > 0) {
        try {
          await this.octokit.rest.issues.addLabels({
            owner,
            repo,
            issue_number: pr.number,
            labels
          })
        } catch (error) {
          // Label addition is not critical, continue
          console.warn(`Warning: Could not add labels: ${error.message}`)
        }
      }

      return {
        success: true,
        number: pr.number,
        url: pr.html_url
      }
    } catch (error) {
      if (error.status === 422) {
        throw new Error('A pull request already exists for this branch')
      }
      throw new Error(`Failed to create pull request: ${error.message}`)
    }
  }

  /**
   * Format PR body from result data
   * @param {Array} data - Result data from engine
   * @returns {String} Formatted markdown body
   */
  formatPRBody (data) {
    const outdated = data.filter(item => item.status === 'outdated')
    const deprecated = data.filter(item => item.status === 'deprecated')

    let body = '## 📦 Dependency Updates\n\n'
    body += 'This PR updates outdated and deprecated dependencies.\n\n'

    // Group by ecosystem
    const npmItems = outdated.filter(item => item.ecosystem === 'npm')
    const dockerItems = outdated.filter(item => item.ecosystem === 'docker')

    if (npmItems.length > 0) {
      body += '### npm Packages\n\n'
      body += '| Package | Current | Latest | Workspace |\n'
      body += '|---------|---------|--------|----------|\n'
      for (const item of npmItems) {
        const workspace = item.workspace || 'root'
        body += `| ${item.name} | ${item.current} | ${item.latest} | ${workspace} |\n`
      }
      body += '\n'
    }

    if (dockerItems.length > 0) {
      body += '### Docker Images\n\n'
      body += '| Service | Image | Current | Latest | File |\n'
      body += '|---------|-------|---------|--------|------|\n'
      for (const item of dockerItems) {
        body += `| ${item.service} | ${item.image} | ${item.current} | ${item.latest} | ${item.file} |\n`
      }
      body += '\n'
    }

    if (deprecated.length > 0) {
      body += '### Deprecated Packages (Removed)\n\n'
      body += '| Package | Version | Workspace |\n'
      body += '|---------|---------|----------|\n'
      for (const item of deprecated) {
        const workspace = item.workspace || 'root'
        body += `| ${item.name} | ${item.current} | ${workspace} |\n`
      }
      body += '\n'
    }

    body += '---\n'
    body += `**Summary**: ${outdated.length} updated, ${deprecated.length} removed\n`
    body += '\n'
    body += '🤖 Generated by [Updated](https://github.com/ahmadnassri/node-updated)\n'

    return body
  }

  /**
   * Full workflow: create branch, commit, and create PR
   * @param {Array<String>} updatedFiles - Files that were updated
   * @param {Array} resultData - Result data for PR body
   * @param {String} baseBranch - Base branch to target
   * @returns {Promise<Object>} Complete workflow result
   */
  async createUpdatePR (updatedFiles, resultData, baseBranch = 'main') {
    // Generate branch name with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const branchName = `updated/dependencies-${timestamp}`

    try {
      // Create branch
      await this.createBranch(branchName, baseBranch)

      // Commit files
      const commitMessage = 'chore: update dependencies\n\nCo-Authored-By: Updated Bot <noreply@github.com>'
      await this.commitFiles(branchName, updatedFiles, commitMessage)

      // Create PR
      const prTitle = 'chore: update dependencies'
      const prBody = this.formatPRBody(resultData)
      const result = await this.createPullRequest(branchName, baseBranch, prTitle, prBody, ['dependencies'])

      return {
        success: true,
        branch: branchName,
        pr: result
      }
    } catch (error) {
      throw new Error(`PR workflow failed: ${error.message}`)
    }
  }
}
