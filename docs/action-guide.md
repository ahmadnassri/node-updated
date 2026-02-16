# GitHub Action Guide

Complete guide for using `updated` as a GitHub Action.

## Table of Contents

- [Quick Start](#quick-start)
- [Common Workflows](#common-workflows)
- [Inputs Reference](#inputs-reference)
- [Outputs Reference](#outputs-reference)
- [Permissions](#permissions)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Check for Outdated Dependencies

Add this workflow to `.github/workflows/check-deps.yml`:

```yaml
name: Check Dependencies
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ahmadnassri/node-updated@v4
```

This will:
- Run on every push and PR
- Check all dependencies, devDependencies, and optionalDependencies
- Create annotations for outdated packages
- Fail if any outdated packages are found

### 2. Weekly Automated Updates

Add this to `.github/workflows/update-deps.yml`:

```yaml
name: Update Dependencies
on:
  schedule:
    - cron: '0 0 * * 1'  # Every Monday at midnight
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: ahmadnassri/node-updated@v4
        with:
          update: true
          create-pr: true
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Install Dependencies
        if: steps.updated.outputs.updated == 'true'
        run: npm install

      - name: Run Tests
        if: steps.updated.outputs.updated == 'true'
        run: npm test
```

This will:
- Run weekly (and on manual trigger)
- Check and update dependencies
- Create a PR with the changes
- Run tests before creating the PR

## Common Workflows

### Report Only (No Updates)

Best for: CI checks on every commit

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    update: false  # Default, can be omitted
```

### Auto-Update with PR

Best for: Scheduled dependency updates

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    update: true
    create-pr: true
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Auto-Update with Direct Commit

Best for: Automated updates to a specific branch

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    update: true
    commit-directly: true
    token: ${{ secrets.GITHUB_TOKEN }}
```

**Warning**: This commits directly to the current branch. Use with caution on protected branches.

### Add Report Comment to PRs

Best for: Reviewing dependency status in PRs

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    add-comment: true
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Monorepo with Workspaces

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    workspaces: true
```

### Filter by Dependency Type

Check only production dependencies:

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    types: dependencies
```

Check only dev dependencies:

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    types: devDependencies
```

### Filter by Scope

Check only `@fastify` packages:

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    scopes: '@fastify'
```

Multiple scopes:

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    scopes: '@fastify,@types'
```

### Ignore Specific Packages

```yaml
- uses: ahmadnassri/node-updated@v4
  with:
    ignore: 'eslint,typescript'
```

## Inputs Reference

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `update` | boolean | `false` | Enable auto-update mode |
| `types` | string | `dependencies,devDependencies,optionalDependencies` | Comma-separated dependency types to check |
| `scopes` | string | ` ` | Comma-separated package scopes (e.g., `@fastify,@types`) |
| `ignore` | string | ` ` | Comma-separated package names to ignore |
| `workspaces` | boolean | `false` | Check all workspaces in monorepo |
| `create-pr` | boolean | `false` | Create PR with updates (requires `update: true` and `token`) |
| `commit-directly` | boolean | `false` | Commit directly to current branch (requires `update: true`) |
| `add-comment` | boolean | `false` | Add report as PR comment (requires `token`) |
| `token` | string | `${{ github.token }}` | GitHub token for PR/commit operations |

**Notes**:
- `create-pr` and `commit-directly` are mutually exclusive
- Setting `update: false` with `create-pr` or `commit-directly` will log a warning
- `add-comment` works independently of `update` mode

## Outputs Reference

| Output | Type | Description |
|--------|------|-------------|
| `outdated-count` | number | Number of outdated packages found |
| `deprecated-count` | number | Number of deprecated packages found |
| `report` | JSON string | Full report array of all checked packages |
| `updated` | boolean | Whether any files were updated |
| `pr-number` | number | PR number (only if `create-pr: true`) |
| `pr-url` | string | PR URL (only if `create-pr: true`) |

### Using Outputs

```yaml
- uses: ahmadnassri/node-updated@v4
  id: check
  with:
    update: false

- name: Check Results
  run: |
    echo "Outdated: ${{ steps.check.outputs.outdated-count }}"
    echo "Deprecated: ${{ steps.check.outputs.deprecated-count }}"

- name: Conditional Step
  if: steps.check.outputs.outdated-count > 0
  run: echo "Found outdated packages!"
```

## Permissions

### Minimum Permissions (Check Only)

```yaml
permissions:
  contents: read
```

### For PR Creation

```yaml
permissions:
  contents: write
  pull-requests: write
```

### For PR Comments

```yaml
permissions:
  pull-requests: write
```

### For Direct Commits

```yaml
permissions:
  contents: write
```

## Advanced Usage

### Matrix Strategy for Multiple Ecosystems

```yaml
strategy:
  matrix:
    ecosystem: [npm, docker]
steps:
  - uses: ahmadnassri/node-updated@v4
    if: matrix.ecosystem == 'npm'
```

### Conditional PR Creation

Only create PR if significant updates found:

```yaml
- uses: ahmadnassri/node-updated@v4
  id: check
  with:
    update: true

- name: Create PR if Major Updates
  if: steps.check.outputs.outdated-count >= 5
  run: |
    # Custom PR creation logic
```

### Combine with Other Actions

```yaml
- uses: ahmadnassri/node-updated@v4
  id: updated

- name: Run Tests
  if: steps.updated.outputs.updated == 'true'
  run: npm test

- name: Build
  if: steps.updated.outputs.updated == 'true'
  run: npm run build

- name: Notify Slack
  if: steps.updated.outputs.outdated-count > 0
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Found ${{ steps.updated.outputs.outdated-count }} outdated packages"
      }
```

## Troubleshooting

### PR Creation Fails

**Error**: "Could not create PR. Check token permissions and branch protection rules."

**Solutions**:
1. Verify `token` has `pull-requests: write` permission
2. Check branch protection rules don't prevent PR creation
3. Ensure the action runs on a branch (not detached HEAD)

### Annotations Not Appearing

**Issue**: Outdated packages found but no annotations visible

**Solutions**:
1. Check that workflow runs from the same repository (not a fork)
2. Verify `contents: read` permission is granted
3. Annotations only appear on files in the repository

### Updates Not Applied

**Issue**: Action runs but files aren't updated

**Solutions**:
1. Verify `update: true` is set
2. Check that packages are actually outdated (not just different)
3. Ensure write permissions if using `commit-directly`

### Action Times Out

**Issue**: Action runs for a long time or times out

**Solutions**:
1. Use `types` to filter dependency types
2. Use `scopes` to check specific scopes only
3. Use `ignore` to skip known-slow packages
4. Split checks across multiple jobs

### Private Package Access

**Issue**: Can't check private packages

**Solutions**:
1. Ensure `.npmrc` is committed (without sensitive tokens)
2. Set up authentication via GitHub secrets
3. Use `NPM_TOKEN` secret in workflow

```yaml
env:
  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Examples

See [.github/workflows/test-action.yml][] for more examples.

## Comparison with Other Tools

| Feature | Updated | Dependabot | Renovate |
|---------|---------|------------|----------|
| Docker Support | ✅ | ✅ | ✅ |
| npm Workspaces | ✅ | ✅ | ✅ |
| Private Registries | ✅ | ✅ | ✅ |
| PR Comments | ✅ | ✅ | ✅ |
| Annotations | ✅ | ❌ | ❌ |
| CLI Tool | ✅ | ❌ | ❌ |
| Zero Config | ✅ | ✅ | ❌ |

[.github/workflows/test-action.yml]: ../.github/workflows/test-action.yml
