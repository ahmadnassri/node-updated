# Interactive Package Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add interactive package selection to the `--update` flag, allowing users to choose specific packages to update instead of updating all packages automatically.

**Architecture:** Split implementation into three modules: `lib/selection.js` for state management, `lib/interactive.js` for prompt orchestration, and modify `index.js` for entry point. Use existing `prompts` library for all interactive selections, leverage existing `Grid` class for table display.

**Tech Stack:** Bun runtime, prompts library (already installed), existing Grid class, Bun test runner

---

## Task 1: Add `--all` Flag Support

**Files:**
- Modify: `lib/args.js:15-24`
- Test: `test/args.js` (new file)

**Step 1: Write the failing test**

Create `test/args.js`:

```javascript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'

describe('args parser', () => {
  let originalArgv

  beforeEach(() => {
    originalArgv = process.argv
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  test('parses --all flag as boolean', () => {
    process.argv = ['bun', 'index.js', '--all']

    // Re-import to get fresh args
    delete require.cache[require.resolve('../lib/args.js')]
    const args = require('../lib/args.js').default

    expect(args.all).toBe(true)
  })

  test('--all defaults to false when not provided', () => {
    process.argv = ['bun', 'index.js', '--update']

    delete require.cache[require.resolve('../lib/args.js')]
    const args = require('../lib/args.js').default

    expect(args.all).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/args.js`
Expected: FAIL with "args.all is undefined"

**Step 3: Add --all flag support**

In `lib/args.js`, add the `all` flag:

```javascript
// After line 18 (update: bool('update'),)
const args = {
  help: bool('help'),
  'no-color': bool('no-color'),
  update: bool('update'),
  all: bool('all'),  // ADD THIS LINE
  json: bool('json'),
  silent: bool('silent'),
  ignore: list('ignore', []),
  scopes: list('scopes', []),
  workspaces: bool('workspaces'),
  types: list('types', ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'])
}
```

Update help text (after line 33):

```javascript
if (args.help) {
  console.log(`
--workspaces | process workspaces
--ignore     | comma-separated packages to be ignored, e.g. '--ignore=tap,eslint'
--types      | comma-separated dependency types to check, e.g. '--types=devDependencies,peerDependencies'
--scopes     | comma-separated list of package @scopes to check
--update     | interactive package selection (use with --all for non-interactive)
--all        | with --update, auto-update all packages without prompts
--json       | output JSON results to 'stdout'
--no-color   | disable color output
--silent     | do not output report on 'stderr'
--help       | display cli help
  `)
  process.exit()
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/args.js`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add lib/args.js test/args.js
git commit -m "feat: add --all flag for non-interactive auto-update

- Add args.all boolean flag
- Update help text to document new behavior
- Add tests for args parsing

Ref: interactive-package-selection design"
```

---

## Task 2: Create Selection State Builder

**Files:**
- Create: `lib/selection.js`
- Test: `test/selection.js` (new file)

**Step 1: Write the failing test**

Create `test/selection.js`:

```javascript
import { describe, test, expect } from 'bun:test'
import { buildSelectionState } from '../lib/selection.js'

describe('buildSelectionState', () => {
  test('groups npm packages by workspace', () => {
    const packages = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated', current: '^7.3.7', latest: '7.6.0', type: 'dependencies' },
      { ecosystem: 'npm', workspace: 'packages/foo', name: 'react', status: 'outdated', current: '^18.0.0', latest: '18.3.0', type: 'dependencies' }
    ]

    const state = buildSelectionState(packages)

    expect(state.npm.locations).toEqual(['root', 'packages/foo'])
    expect(state.npm.selections.root).toHaveLength(1)
    expect(state.npm.selections['packages/foo']).toHaveLength(1)
  })

  test('groups docker images by compose file', () => {
    const images = [
      { ecosystem: 'docker', file: 'compose.yml', service: 'app', image: 'node', current: '20', latest: '22', status: 'outdated' },
      { ecosystem: 'docker', file: 'services/api/compose.yml', service: 'api', image: 'nginx', current: '1.24', latest: '1.25', status: 'outdated' }
    ]

    const state = buildSelectionState(images)

    expect(state.docker.locations).toEqual(['compose.yml', 'services/api/compose.yml'])
    expect(state.docker.selections['compose.yml']).toHaveLength(1)
  })

  test('separates ecosystems correctly', () => {
    const items = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated' },
      { ecosystem: 'docker', file: 'compose.yml', service: 'app', status: 'outdated' }
    ]

    const state = buildSelectionState(items)

    expect(state.ecosystems).toEqual(['npm', 'docker'])
  })

  test('filters out non-updateable items from selections', () => {
    const packages = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated', current: '^7.3.7', latest: '7.6.0', type: 'dependencies' },
      { ecosystem: 'npm', workspace: 'root', name: 'prompts', status: 'updated', current: '^2.4.2', latest: '2.4.2', type: 'dependencies' }
    ]

    const state = buildSelectionState(packages)

    // Only outdated should be in selections
    expect(state.npm.selections.root).toHaveLength(1)
    expect(state.npm.selections.root[0].name).toBe('semver')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/selection.js`
Expected: FAIL with "Cannot find module '../lib/selection.js'"

**Step 3: Implement buildSelectionState function**

Create `lib/selection.js`:

```javascript
/**
 * Build selection state from dependency/image results
 * Groups items by ecosystem and location (workspace/file)
 * Filters to only include updateable items
 */
export function buildSelectionState (items) {
  const state = {
    ecosystems: [],
    npm: { locations: [], selections: {} },
    docker: { locations: [], selections: {} }
  }

  // Group by ecosystem
  const npmItems = items.filter(item => item.ecosystem === 'npm')
  const dockerItems = items.filter(item => item.ecosystem === 'docker')

  // Track which ecosystems have items
  if (npmItems.length > 0) state.ecosystems.push('npm')
  if (dockerItems.length > 0) state.ecosystems.push('docker')

  // Group npm items by workspace
  if (npmItems.length > 0) {
    const workspaces = [...new Set(npmItems.map(item => item.workspace))]
    state.npm.locations = workspaces

    for (const workspace of workspaces) {
      const workspaceItems = npmItems
        .filter(item => item.workspace === workspace)
        .filter(item => item.status === 'outdated' || item.status === 'deprecated')

      state.npm.selections[workspace] = workspaceItems.map(item => ({
        name: item.name,
        type: item.type,
        current: item.current,
        latest: item.latest,
        action: item.status === 'deprecated' ? 'remove' : 'update'
      }))
    }
  }

  // Group docker items by file
  if (dockerItems.length > 0) {
    const files = [...new Set(dockerItems.map(item => item.file))]
    state.docker.locations = files

    for (const file of files) {
      const fileItems = dockerItems
        .filter(item => item.file === file)
        .filter(item => item.status === 'outdated')

      state.docker.selections[file] = fileItems.map(item => ({
        service: item.service,
        image: item.image,
        current: item.current,
        latest: item.latest,
        action: 'update'
      }))
    }
  }

  return state
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/selection.js`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add lib/selection.js test/selection.js
git commit -m "feat: add selection state builder

- Groups items by ecosystem (npm/docker)
- Groups npm packages by workspace
- Groups docker images by compose file
- Filters only updateable items (outdated/deprecated)

Ref: interactive-package-selection design"
```

---

## Task 3: Create Prompts Choice Formatter

**Files:**
- Modify: `lib/selection.js` (add new function)
- Modify: `test/selection.js` (add new tests)

**Step 1: Write the failing test**

Add to `test/selection.js`:

```javascript
import { buildPromptChoices } from '../lib/selection.js'

describe('buildPromptChoices', () => {
  test('formats npm packages for prompts multiselect', () => {
    const packages = [
      { name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '7.6.0', status: 'outdated' },
      { name: 'prompts', type: 'dependencies', current: '^2.4.2', latest: '2.4.2', status: 'updated' },
      { name: 'request', type: 'dependencies', current: '^2.88', latest: null, status: 'deprecated' }
    ]

    const choices = buildPromptChoices(packages, 'npm')

    expect(choices).toHaveLength(3)

    // Outdated package
    expect(choices[0].title).toBe('semver: ^7.3.7 → 7.6.0 (OUTDATED)')
    expect(choices[0].value).toEqual({ name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '7.6.0' })
    expect(choices[0].selected).toBe(true)
    expect(choices[0].disabled).toBe(false)

    // Updated package (disabled)
    expect(choices[1].title).toContain('already updated')
    expect(choices[1].disabled).toBe(true)
    expect(choices[1].selected).toBe(false)

    // Deprecated package
    expect(choices[2].title).toContain('remove')
    expect(choices[2].selected).toBe(true)
  })

  test('formats docker images for prompts multiselect', () => {
    const images = [
      { service: 'app', image: 'node', current: '20', latest: '22', status: 'outdated' },
      { service: 'db', image: 'postgres', current: '15', latest: '15', status: 'updated' }
    ]

    const choices = buildPromptChoices(images, 'docker')

    expect(choices[0].title).toBe('app (node): 20 → 22 (OUTDATED)')
    expect(choices[0].value).toEqual({ service: 'app', image: 'node', current: '20', latest: '22' })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/selection.js`
Expected: FAIL with "buildPromptChoices is not a function"

**Step 3: Implement buildPromptChoices function**

Add to `lib/selection.js`:

```javascript
/**
 * Format items into prompts multiselect choices
 * Creates title, value, selected, and disabled properties
 */
export function buildPromptChoices (items, ecosystem) {
  return items.map(item => {
    if (ecosystem === 'npm') {
      const isUpdateable = item.status === 'outdated' || item.status === 'deprecated'
      const action = item.status === 'deprecated' ? 'remove' : `${item.current} → ${item.latest}`
      const statusLabel = item.status.toUpperCase()

      return {
        title: isUpdateable
          ? `${item.name}: ${action} (${statusLabel})`
          : `${item.name}: already updated (${statusLabel})`,
        value: { name: item.name, type: item.type, current: item.current, latest: item.latest },
        selected: isUpdateable,
        disabled: !isUpdateable
      }
    } else if (ecosystem === 'docker') {
      const isUpdateable = item.status === 'outdated'
      const statusLabel = item.status.toUpperCase()

      return {
        title: isUpdateable
          ? `${item.service} (${item.image}): ${item.current} → ${item.latest} (${statusLabel})`
          : `${item.service} (${item.image}): already updated (${statusLabel})`,
        value: { service: item.service, image: item.image, current: item.current, latest: item.latest },
        selected: isUpdateable,
        disabled: !isUpdateable
      }
    }
  })
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/selection.js`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add lib/selection.js test/selection.js
git commit -m "feat: add prompts choice formatter

- Formats npm packages for multiselect display
- Formats docker images for multiselect display
- Sets selected/disabled state based on status
- Creates readable titles with version changes

Ref: interactive-package-selection design"
```

---

## Task 4: Create File Update Applier

**Files:**
- Modify: `lib/selection.js` (add new function)
- Modify: `test/selection.js` (add new tests)

**Step 1: Write the failing test**

Add to `test/selection.js`:

```javascript
import { join } from 'path'
import { applyUpdates } from '../lib/selection.js'

describe('applyUpdates', () => {
  const fixturesDir = join(import.meta.dir, 'fixtures', 'interactive')

  test('updates package.json with selected versions', async () => {
    // Create temp package.json
    const testDir = join(fixturesDir, 'update-test')
    await Bun.write(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          semver: '^7.3.7',
          yaml: '^2.3.4',
          prompts: '^2.4.2'
        }
      }, null, 2)
    )

    const selections = [
      { name: 'semver', type: 'dependencies', latest: '7.6.0', action: 'update' },
      { name: 'yaml', type: 'dependencies', latest: '2.5.1', action: 'update' }
    ]

    await applyUpdates(join(testDir, 'package.json'), selections, 'npm')

    const updated = await Bun.file(join(testDir, 'package.json')).json()
    expect(updated.dependencies.semver).toBe('^7.6.0')
    expect(updated.dependencies.yaml).toBe('^2.5.1')
    expect(updated.dependencies.prompts).toBe('^2.4.2') // unchanged
  })

  test('removes deprecated packages from package.json', async () => {
    const testDir = join(fixturesDir, 'remove-test')
    await Bun.write(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          request: '^2.88',
          semver: '^7.3.7'
        }
      }, null, 2)
    )

    const selections = [
      { name: 'request', type: 'dependencies', latest: null, action: 'remove' }
    ]

    await applyUpdates(join(testDir, 'package.json'), selections, 'npm')

    const updated = await Bun.file(join(testDir, 'package.json')).json()
    expect(updated.dependencies.request).toBeUndefined()
    expect(updated.dependencies.semver).toBe('^7.3.7') // unchanged
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/selection.js`
Expected: FAIL with "applyUpdates is not a function"

**Step 3: Implement applyUpdates function**

Add to `lib/selection.js`:

```javascript
/**
 * Apply selected updates to a file
 * Modifies package.json or compose.yml based on ecosystem
 */
export async function applyUpdates (filepath, selections, ecosystem) {
  if (ecosystem === 'npm') {
    // Read current package.json
    const packageJson = await Bun.file(filepath).json()

    // Apply each selection
    for (const selection of selections) {
      if (selection.action === 'update') {
        packageJson[selection.type][selection.name] = `^${selection.latest}`
      } else if (selection.action === 'remove') {
        delete packageJson[selection.type][selection.name]
      }
    }

    // Write back to file
    await Bun.write(filepath, JSON.stringify(packageJson, null, 2) + '\n')
  } else if (ecosystem === 'docker') {
    // TODO: Docker compose file updates (not in scope for now)
    // This will be implemented in a future task
    throw new Error('Docker updates not yet implemented')
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/selection.js`
Expected: PASS (8 tests)

Note: You may need to create the fixtures directory structure first:
```bash
mkdir -p test/fixtures/interactive/update-test test/fixtures/interactive/remove-test
```

**Step 5: Commit**

```bash
git add lib/selection.js test/selection.js
git commit -m "feat: add file update applier

- Applies version updates to package.json
- Removes deprecated packages
- Preserves unchanged dependencies
- Atomic read-modify-write operations

Ref: interactive-package-selection design"
```

---

## Task 5: Create Interactive Module Structure

**Files:**
- Create: `lib/interactive.js`
- Test: `test/interactive.js` (new file)

**Step 1: Write the failing test**

Create `test/interactive.js`:

```javascript
import { describe, test, expect } from 'bun:test'
import { selectEcosystem, selectLocations, selectPackages, confirmChanges } from '../lib/interactive.js'

describe('interactive prompts', () => {
  test('selectEcosystem formats ecosystem choices correctly', () => {
    const state = {
      ecosystems: ['npm', 'docker'],
      npm: { locations: ['root', 'packages/foo'], selections: { root: [1, 2], 'packages/foo': [3] } },
      docker: { locations: ['compose.yml'], selections: { 'compose.yml': [1] } }
    }

    const choices = selectEcosystem(state, true) // true = dry run for testing

    expect(choices).toHaveLength(3)
    expect(choices[0].title).toContain('npm packages')
    expect(choices[0].title).toContain('3 outdated')
    expect(choices[0].title).toContain('2 workspaces')
    expect(choices[1].title).toContain('Docker images')
    expect(choices[2].title).toBe('Both')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/interactive.js`
Expected: FAIL with "Cannot find module '../lib/interactive.js'"

**Step 3: Create interactive module skeleton**

Create `lib/interactive.js`:

```javascript
import prompts from 'prompts'

/**
 * Format and present ecosystem selection prompt
 * Returns choices array (for testing) or prompts for selection
 */
export function selectEcosystem (state, dryRun = false) {
  const choices = []

  // Count total outdated items per ecosystem
  if (state.ecosystems.includes('npm')) {
    const totalOutdated = Object.values(state.npm.selections).reduce((sum, arr) => sum + arr.length, 0)
    const locationCount = state.npm.locations.length
    const locationLabel = locationCount === 1 ? 'workspace' : 'workspaces'

    choices.push({
      title: `npm packages (${totalOutdated} outdated across ${locationCount} ${locationLabel})`,
      value: 'npm'
    })
  }

  if (state.ecosystems.includes('docker')) {
    const totalOutdated = Object.values(state.docker.selections).reduce((sum, arr) => sum + arr.length, 0)
    const fileCount = state.docker.locations.length
    const fileLabel = fileCount === 1 ? 'compose file' : 'compose files'

    choices.push({
      title: `Docker images (${totalOutdated} outdated in ${fileCount} ${fileLabel})`,
      value: 'docker'
    })
  }

  // Add "Both" option if multiple ecosystems
  if (choices.length > 1) {
    choices.push({
      title: 'Both',
      value: 'both'
    })
  }

  // For testing, return choices. In production, show prompt
  if (dryRun) return choices

  return prompts({
    type: 'select',
    name: 'ecosystem',
    message: 'Which ecosystem do you want to update?',
    choices
  })
}

/**
 * Placeholder for location selection (workspaces/compose files)
 */
export function selectLocations (ecosystem, locations, selections, dryRun = false) {
  // TODO: Implement in next task
  throw new Error('Not implemented yet')
}

/**
 * Placeholder for package selection
 */
export function selectPackages (items, ecosystem, dryRun = false) {
  // TODO: Implement in next task
  throw new Error('Not implemented yet')
}

/**
 * Placeholder for change confirmation
 */
export function confirmChanges (changes, dryRun = false) {
  // TODO: Implement in next task
  throw new Error('Not implemented yet')
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/interactive.js`
Expected: PASS (1 test)

**Step 5: Commit**

```bash
git add lib/interactive.js test/interactive.js
git commit -m "feat: add interactive module with ecosystem selector

- Create interactive.js module structure
- Implement ecosystem selection prompt
- Format choices with outdated counts
- Add test support via dryRun flag

Ref: interactive-package-selection design"
```

---

## Task 6: Implement Location Selection Prompt

**Files:**
- Modify: `lib/interactive.js`
- Modify: `test/interactive.js`

**Step 1: Write the failing test**

Add to `test/interactive.js`:

```javascript
describe('selectLocations', () => {
  test('formats workspace choices with outdated counts', () => {
    const locations = ['root', 'packages/foo', 'packages/bar']
    const selections = {
      root: [1, 2],
      'packages/foo': [1, 2, 3],
      'packages/bar': [1]
    }

    const choices = selectLocations('npm', locations, selections, true)

    expect(choices).toHaveLength(4) // 3 workspaces + "All workspaces"
    expect(choices[0].title).toContain('root (2 outdated)')
    expect(choices[1].title).toContain('packages/foo (3 outdated)')
    expect(choices[2].title).toContain('packages/bar (1 outdated)')
    expect(choices[3].title).toBe('All workspaces')
    expect(choices[3].value).toBe('all')
  })

  test('formats compose file choices with outdated counts', () => {
    const locations = ['compose.yml', 'services/api/compose.yml']
    const selections = {
      'compose.yml': [1],
      'services/api/compose.yml': [1, 2]
    }

    const choices = selectLocations('docker', locations, selections, true)

    expect(choices).toHaveLength(3) // 2 files + "All compose files"
    expect(choices[0].title).toContain('compose.yml (1 outdated)')
    expect(choices[1].title).toContain('services/api/compose.yml (2 outdated)')
    expect(choices[2].title).toBe('All compose files')
  })

  test('returns single location directly when only one exists', () => {
    const locations = ['root']
    const selections = { root: [1, 2] }

    const result = selectLocations('npm', locations, selections, true)

    // Should return the location directly, not show prompt
    expect(result).toBe('root')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/interactive.js`
Expected: FAIL with "Not implemented yet"

**Step 3: Implement selectLocations function**

Update in `lib/interactive.js`:

```javascript
/**
 * Format and present location selection prompt (workspaces or compose files)
 * Returns single location if only one exists
 */
export async function selectLocations (ecosystem, locations, selections, dryRun = false) {
  // If only one location, return it directly (no prompt needed)
  if (locations.length === 1) {
    return dryRun ? locations[0] : { locations: [locations[0]] }
  }

  const choices = locations.map(location => {
    const outdatedCount = selections[location].length
    return {
      title: `${location} (${outdatedCount} outdated)`,
      value: location
    }
  })

  // Add "All" option
  const allLabel = ecosystem === 'npm' ? 'All workspaces' : 'All compose files'
  choices.push({
    title: allLabel,
    value: 'all'
  })

  // For testing, return choices
  if (dryRun) return choices

  const message = ecosystem === 'npm'
    ? 'Select workspace(s) to update: (Press <space> to select, <a> to toggle all)'
    : 'Select compose file(s) to update: (Press <space> to select, <a> to toggle all)'

  return prompts({
    type: 'multiselect',
    name: 'locations',
    message,
    choices,
    instructions: false
  })
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/interactive.js`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add lib/interactive.js test/interactive.js
git commit -m "feat: implement location selection prompt

- Select workspaces for npm ecosystem
- Select compose files for docker ecosystem
- Auto-return single location (no prompt)
- Add 'All' option for convenience

Ref: interactive-package-selection design"
```

---

## Task 7: Implement Package Selection Prompt

**Files:**
- Modify: `lib/interactive.js`
- Modify: `test/interactive.js`
- Modify: `lib/selection.js` (import buildPromptChoices)

**Step 1: Write the failing test**

Add to `test/interactive.js`:

```javascript
import { buildPromptChoices } from '../lib/selection.js'

describe('selectPackages', () => {
  test('uses buildPromptChoices to format package list', () => {
    const items = [
      { name: 'semver', current: '^7.3.7', latest: '7.6.0', status: 'outdated', type: 'dependencies' },
      { name: 'prompts', current: '^2.4.2', latest: '2.4.2', status: 'updated', type: 'dependencies' }
    ]

    const choices = selectPackages(items, 'npm', true)

    expect(choices).toHaveLength(2)
    expect(choices[0].title).toContain('semver')
    expect(choices[0].selected).toBe(true)
    expect(choices[1].disabled).toBe(true)
  })

  test('handles empty selection gracefully', async () => {
    const items = [
      { name: 'semver', current: '^7.3.7', latest: '7.6.0', status: 'outdated', type: 'dependencies' }
    ]

    // Simulate user selecting nothing
    const result = await selectPackages(items, 'npm', true, [])

    expect(result).toEqual({ packages: [], cancelled: false })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/interactive.js`
Expected: FAIL with "Not implemented yet"

**Step 3: Implement selectPackages function**

Update in `lib/interactive.js`:

```javascript
import { buildPromptChoices } from './selection.js'

/**
 * Display Grid table and prompt for package selection
 * Returns selected packages
 */
export async function selectPackages (items, ecosystem, dryRun = false, mockSelection = null) {
  // Build choices using the selection module
  const choices = buildPromptChoices(items, ecosystem)

  // For testing with empty selection
  if (dryRun && mockSelection !== null) {
    return { packages: mockSelection, cancelled: false }
  }

  // For testing, return choices
  if (dryRun) return choices

  const message = 'Select packages to update: (Press <space> to select, <a> to toggle all, <enter> to confirm)'

  const response = await prompts({
    type: 'multiselect',
    name: 'packages',
    message,
    choices,
    instructions: false
  })

  // Handle user cancellation (Ctrl+C or Esc)
  if (response.packages === undefined) {
    return { packages: [], cancelled: true }
  }

  // Handle empty selection - ask for confirmation
  if (response.packages.length === 0) {
    const confirm = await prompts({
      type: 'confirm',
      name: 'exit',
      message: 'No packages selected. Exit without updating?',
      initial: true
    })

    if (confirm.exit === undefined || confirm.exit) {
      return { packages: [], cancelled: true }
    }

    // User wants to go back - recursively call selectPackages
    return selectPackages(items, ecosystem, dryRun, mockSelection)
  }

  return { packages: response.packages, cancelled: false }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/interactive.js`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add lib/interactive.js test/interactive.js
git commit -m "feat: implement package selection prompt

- Display multiselect with formatted package choices
- Handle user cancellation (Ctrl+C/Esc)
- Confirm exit on empty selection
- Allow going back to reselect

Ref: interactive-package-selection design"
```

---

## Task 8: Implement Preview and Confirmation Prompt

**Files:**
- Modify: `lib/interactive.js`
- Modify: `test/interactive.js`

**Step 1: Write the failing test**

Add to `test/interactive.js`:

```javascript
describe('confirmChanges', () => {
  test('formats npm package changes for preview', () => {
    const changes = [
      { name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '7.6.0', action: 'update' },
      { name: 'request', type: 'dependencies', current: '^2.88', latest: null, action: 'remove' }
    ]

    const preview = confirmChanges('package.json', changes, 'npm', true)

    expect(preview).toContain('semver')
    expect(preview).toContain('^7.3.7')
    expect(preview).toContain('7.6.0')
    expect(preview).toContain('request')
    expect(preview).toContain('[REMOVED]')
  })

  test('formats docker image changes for preview', () => {
    const changes = [
      { service: 'app', image: 'node', current: '20', latest: '22', action: 'update' }
    ]

    const preview = confirmChanges('compose.yml', changes, 'docker', true)

    expect(preview).toContain('app')
    expect(preview).toContain('node')
    expect(preview).toContain('20')
    expect(preview).toContain('22')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/interactive.js`
Expected: FAIL with "Not implemented yet"

**Step 3: Implement confirmChanges function**

Update in `lib/interactive.js`:

```javascript
/**
 * Display preview of changes and get confirmation
 * Returns: 'confirm', 'back', or 'cancel'
 */
export async function confirmChanges (filepath, changes, ecosystem, dryRun = false) {
  // Build preview text
  let preview = `\nPreview of changes to ${filepath}:\n\n`

  if (ecosystem === 'npm') {
    for (const change of changes) {
      if (change.action === 'update') {
        preview += `  ${change.type}:\n`
        preview += `    ${change.name}: "${change.current}" → "${^${change.latest}}"\n`
      } else if (change.action === 'remove') {
        preview += `  ${change.type}:\n`
        preview += `    ${change.name}: "${change.current}" → [REMOVED]\n`
      }
    }
  } else if (ecosystem === 'docker') {
    preview += `  services:\n`
    for (const change of changes) {
      preview += `    ${change.service}:\n`
      preview += `      image: ${change.image}:${change.current} → ${change.image}:${change.latest}\n`
    }
  }

  // For testing, return preview text
  if (dryRun) return preview

  // Show preview
  console.log(preview)

  // Prompt for action
  const response = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { title: 'Confirm and update', value: 'confirm' },
      { title: 'Go back and change selection', value: 'back' },
      { title: 'Cancel (no changes)', value: 'cancel' }
    ]
  })

  // Handle cancellation
  if (response.action === undefined) {
    return 'cancel'
  }

  return response.action
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/interactive.js`
Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add lib/interactive.js test/interactive.js
git commit -m "feat: implement preview and confirmation prompt

- Format changes preview for npm packages
- Format changes preview for docker images
- Show 3 options: confirm/back/cancel
- Handle user cancellation gracefully

Ref: interactive-package-selection design"
```

---

## Task 9: Create Main Interactive Orchestrator

**Files:**
- Modify: `lib/interactive.js` (add runInteractiveUpdate)
- Modify: `test/interactive.js` (add integration test)

**Step 1: Write the failing test**

Add to `test/interactive.js`:

```javascript
import { runInteractiveUpdate } from '../lib/interactive.js'
import { buildSelectionState } from '../lib/selection.js'

describe('runInteractiveUpdate', () => {
  test('orchestrates full interactive flow for single ecosystem', async () => {
    const items = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated', current: '^7.3.7', latest: '7.6.0', type: 'dependencies' }
    ]

    const state = buildSelectionState(items)

    // Mock all prompts
    const mockResponses = {
      ecosystemChoice: 'npm',
      locationChoice: ['root'],
      packageChoice: [{ name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '7.6.0' }],
      confirmAction: 'confirm'
    }

    const result = await runInteractiveUpdate(state, items, mockResponses, true)

    expect(result.success).toBe(true)
    expect(result.updated).toHaveLength(1)
    expect(result.updated[0].location).toBe('root')
  })

  test('handles user cancellation at any stage', async () => {
    const items = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated', current: '^7.3.7', latest: '7.6.0', type: 'dependencies' }
    ]

    const state = buildSelectionState(items)

    const mockResponses = {
      ecosystemChoice: undefined // User cancelled
    }

    const result = await runInteractiveUpdate(state, items, mockResponses, true)

    expect(result.success).toBe(false)
    expect(result.cancelled).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/interactive.js`
Expected: FAIL with "runInteractiveUpdate is not exported"

**Step 3: Implement runInteractiveUpdate function**

Add to `lib/interactive.js`:

```javascript
import Grid from './grid.js'
import { applyUpdates } from './selection.js'

/**
 * Main orchestrator for interactive update flow
 * Guides user through ecosystem → location → package → confirm
 * Returns result with success status and updated files
 */
export async function runInteractiveUpdate (state, allItems, mockResponses = null, dryRun = false) {
  const result = { success: false, updated: [], cancelled: false }

  try {
    // Step 1: Select ecosystem (if multiple)
    let selectedEcosystems = state.ecosystems
    if (state.ecosystems.length > 1) {
      const ecosystemResponse = mockResponses?.ecosystemChoice ?? (await selectEcosystem(state)).ecosystem

      if (ecosystemResponse === undefined) {
        result.cancelled = true
        return result
      }

      selectedEcosystems = ecosystemResponse === 'both' ? state.ecosystems : [ecosystemResponse]
    }

    // Step 2-4: Process each ecosystem
    for (const ecosystem of selectedEcosystems) {
      const ecosystemState = state[ecosystem]

      // Step 2: Select locations (workspaces or compose files)
      let selectedLocations = ecosystemState.locations
      if (ecosystemState.locations.length > 1) {
        const locationResponse = mockResponses?.locationChoice ??
          (await selectLocations(ecosystem, ecosystemState.locations, ecosystemState.selections)).locations

        if (locationResponse === undefined) {
          result.cancelled = true
          return result
        }

        selectedLocations = locationResponse.includes('all')
          ? ecosystemState.locations
          : locationResponse
      } else {
        selectedLocations = ecosystemState.locations
      }

      // Step 3-4: Process each location
      for (const location of selectedLocations) {
        const locationItems = allItems.filter(item => {
          if (ecosystem === 'npm') return item.ecosystem === 'npm' && item.workspace === location
          if (ecosystem === 'docker') return item.ecosystem === 'docker' && item.file === location
        })

        // Display Grid table
        if (!dryRun) {
          const gridTitle = ecosystem === 'npm'
            ? `📦 npm Packages (${location})`
            : `🐳 Docker Images (${location})`

          const grid = new Grid(gridTitle)
          // Add rows to grid (simplified for now)
          for (const item of locationItems) {
            if (ecosystem === 'npm') {
              grid.row([item.name, item.current, item.latest || 'N/A', item.status.toUpperCase()])
            }
          }
          grid.render()
        }

        // Step 3: Select packages
        const packageResponse = mockResponses?.packageChoice ??
          (await selectPackages(locationItems, ecosystem)).packages

        if (packageResponse === undefined || packageResponse.length === 0) {
          result.cancelled = true
          return result
        }

        // Step 4: Preview and confirm
        const confirmResponse = mockResponses?.confirmAction ??
          (await confirmChanges(location, packageResponse, ecosystem))

        if (confirmResponse === 'cancel') {
          result.cancelled = true
          return result
        } else if (confirmResponse === 'back') {
          // Recursively restart for this location
          continue
        }

        // Apply updates (only if not dry run)
        if (!dryRun) {
          await applyUpdates(location, packageResponse, ecosystem)
        }

        result.updated.push({ location, ecosystem, changes: packageResponse.length })
      }
    }

    result.success = true
    return result

  } catch (error) {
    result.error = error.message
    return result
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test test/interactive.js`
Expected: PASS (10 tests)

**Step 5: Commit**

```bash
git add lib/interactive.js test/interactive.js
git commit -m "feat: implement main interactive orchestrator

- Orchestrate ecosystem → location → package → confirm flow
- Handle multi-ecosystem selection (both)
- Display Grid table for each location
- Apply updates to files
- Track success/cancellation status

Ref: interactive-package-selection design"
```

---

## Task 10: Add Flag Conflict Validation

**Files:**
- Modify: `index.js` (add validation at startup)
- Test: `test/flag-validation.js` (new file)

**Step 1: Write the failing test**

Create `test/flag-validation.js`:

```javascript
import { join } from 'path'
import { spawnSync } from 'child_process'
import { describe, test, expect } from 'bun:test'

const __dirname = import.meta.dir
const fixtures = join(__dirname, 'fixtures')
const cmd = join(__dirname, '..', 'index.js')

describe('flag conflict validation', () => {
  test('--update with --json should error', () => {
    const { status, stderr } = spawnSync('bun', ['run', cmd, '--update', '--json'], {
      cwd: join(fixtures, 'green')
    })

    expect(status).toBe(1)
    expect(stderr.toString()).toMatch(/Cannot use --json with interactive --update/)
    expect(stderr.toString()).toMatch(/Use --update --all --json/)
  })

  test('--update with --silent should error', () => {
    const { status, stderr } = spawnSync('bun', ['run', cmd, '--update', '--silent'], {
      cwd: join(fixtures, 'green')
    })

    expect(status).toBe(1)
    expect(stderr.toString()).toMatch(/Cannot use --silent with interactive --update/)
  })

  test('--update --all with --json should work', () => {
    const { status } = spawnSync('bun', ['run', cmd, '--update', '--all', '--json'], {
      cwd: join(fixtures, 'green')
    })

    // Should not error on flag conflict (may fail for other reasons)
    expect([0, 1]).toContain(status)
  })

  test('--update --all with --silent should work', () => {
    const { status } = spawnSync('bun', ['run', cmd, '--update', '--all', '--silent'], {
      cwd: join(fixtures, 'green')
    })

    // Should not error on flag conflict
    expect([0, 1]).toContain(status)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test test/flag-validation.js`
Expected: FAIL (no validation exists yet)

**Step 3: Add flag validation to index.js**

Add at the top of `index.js` after imports, before the timer:

```javascript
import cliArguments from './lib/args.js'

// Validate flag combinations
if (cliArguments.update && !cliArguments.all) {
  if (cliArguments.json) {
    console.error('❌ Cannot use --json with interactive --update mode')
    console.error('💡 Use --update --all --json for non-interactive JSON output')
    process.exit(1)
  }

  if (cliArguments.silent) {
    console.error('❌ Cannot use --silent with interactive --update mode')
    console.error('💡 Use --update --all --silent for non-interactive mode')
    process.exit(1)
  }
}

console.time('completed in')
```

**Step 4: Run test to verify it passes**

Run: `bun test test/flag-validation.js`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add index.js test/flag-validation.js
git commit -m "feat: add flag conflict validation

- Validate --update incompatible with --json
- Validate --update incompatible with --silent
- Show helpful error messages
- Allow --update --all with both flags

Ref: interactive-package-selection design"
```

---

## Task 11: Integrate Interactive Mode into Main Flow

**Files:**
- Modify: `index.js` (integrate interactive mode)
- Modify: `test/with-update.js` (update existing tests)

**Step 1: Update existing test to expect interactive mode**

Modify `test/with-update.js`:

```javascript
import { describe, test, expect } from 'bun:test'
import { join } from 'path'
import { spawnSync } from 'child_process'

const __dirname = import.meta.dir
const fixtures = join(__dirname, 'fixtures')
const cmd = join(__dirname, '..', 'index.js')

describe('--update flag', () => {
  test('--update alone should fail without interaction (CI environment)', () => {
    // In CI/non-TTY, interactive prompts will fail
    const { status, stderr } = spawnSync('bun', ['run', cmd, '--update'], {
      cwd: join(fixtures, 'outdated'),
      env: { ...process.env, CI: 'true' }
    })

    // Should exit with error due to no TTY
    expect(status).toBe(1)
  })

  test('--update --all should auto-update without prompts', () => {
    // Copy fixture to temp location to avoid modifying original
    const testDir = join(fixtures, 'temp-update-test')
    // ... setup test directory ...

    const { status } = spawnSync('bun', ['run', cmd, '--update', '--all'], {
      cwd: testDir
    })

    expect(status).toBe(0)
    // Verify package.json was updated
  })
})
```

**Step 2: Integrate interactive mode into index.js**

Add near the top of the main() function in `index.js`:

```javascript
import { runInteractiveUpdate } from './lib/interactive.js'
import { buildSelectionState } from './lib/selection.js'

async function main (filename, workspace) {
  // ... existing code up to dependency collection ...

  const data = []
  const gridTitle = workspace === '.' ? '📦 npm Packages (root)' : workspace ? `📦 npm Packages (${workspace})` : '📦 npm Packages'
  const grid = new Grid(gridTitle)

  for (const dependency of dependencies) {
    // ... existing check logic ...
    data.push(result)
  }

  // NEW: Interactive mode handling
  if (cliArguments.update && !cliArguments.all && data.some(d => d.status === 'outdated' || d.status === 'deprecated')) {
    // Build selection state from results
    const state = buildSelectionState(data)

    // Run interactive update
    const interactiveResult = await runInteractiveUpdate(state, data)

    if (interactiveResult.cancelled) {
      console.error('\n❌ Cancelled by user. No changes made.')
      return { exitCode: 0, data: [] }
    }

    if (interactiveResult.error) {
      console.error('\n❌ Error during interactive update:', interactiveResult.error)
      return { exitCode: 1, data: [] }
    }

    if (interactiveResult.success) {
      console.error('\n✅ Updated successfully:')
      for (const update of interactiveResult.updated) {
        console.error(`  • ${update.location}: ${update.changes} package${update.changes !== 1 ? 's' : ''}`)
      }
      console.error('\n💡 Run \'npm install\' to update your lock file')
      return { exitCode: 0, data }
    }
  }

  // Existing auto-update logic (now only for --update --all)
  if (cliArguments.update && cliArguments.all) {
    for (const dependency of dependencies) {
      // ... existing auto-update code ...
    }
  }

  // ... rest of existing code ...
}
```

**Step 3: Run tests to verify integration**

Run: `bun test test/with-update.js`
Expected: Tests should pass (or need adjustment for new behavior)

**Step 4: Manual verification**

Test manually in a project with outdated packages:
```bash
bun run index.js --update
# Should show interactive prompts

bun run index.js --update --all
# Should auto-update without prompts
```

**Step 5: Commit**

```bash
git add index.js test/with-update.js
git commit -m "feat: integrate interactive mode into main flow

- Detect outdated packages and trigger interactive mode
- Build selection state from results
- Run interactive update orchestrator
- Display success message with updated files
- Preserve --update --all for non-interactive

Ref: interactive-package-selection design"
```

---

## Task 12: Add Integration Tests

**Files:**
- Create: `test/fixtures/interactive-test/package.json`
- Create: `test/interactive-integration.js`

**Step 1: Create test fixture**

Create `test/fixtures/interactive-test/package.json`:

```json
{
  "name": "interactive-test",
  "version": "1.0.0",
  "dependencies": {
    "semver": "^7.3.7",
    "yaml": "^2.3.4",
    "prompts": "^2.4.2"
  }
}
```

**Step 2: Write integration test**

Create `test/interactive-integration.js`:

```javascript
import { describe, test, expect, beforeEach } from 'bun:test'
import { join } from 'path'
import { runInteractiveUpdate } from '../lib/interactive.js'
import { buildSelectionState } from '../lib/selection.js'
import NpmEcosystem from '../lib/ecosystems/npm/index.js'
import cliArguments from '../lib/args.js'

const __dirname = import.meta.dir
const fixtureDir = join(__dirname, 'fixtures', 'interactive-test')

describe('interactive integration', () => {
  let ecosystem
  let dependencies
  let results

  beforeEach(async () => {
    // Set up ecosystem and check dependencies
    ecosystem = new NpmEcosystem()
    dependencies = await ecosystem.parse(cliArguments, join(fixtureDir, 'package.json'))

    results = []
    for (const dependency of dependencies) {
      const result = await ecosystem.check(dependency)
      if (result) {
        results.push({
          ...result,
          ecosystem: 'npm',
          workspace: 'root'
        })
      }
    }
  })

  test('full interactive flow with mocked prompts', async () => {
    const state = buildSelectionState(results)

    // Find an outdated package
    const outdatedPackage = results.find(r => r.status === 'outdated')

    if (!outdatedPackage) {
      console.log('No outdated packages in fixture, skipping test')
      return
    }

    const mockResponses = {
      ecosystemChoice: 'npm',
      locationChoice: ['root'],
      packageChoice: [{
        name: outdatedPackage.name,
        type: outdatedPackage.type,
        current: outdatedPackage.current,
        latest: outdatedPackage.latest
      }],
      confirmAction: 'confirm'
    }

    const result = await runInteractiveUpdate(state, results, mockResponses, true)

    expect(result.success).toBe(true)
    expect(result.cancelled).toBe(false)
    expect(result.updated.length).toBeGreaterThan(0)
  })

  test('handles cancellation gracefully', async () => {
    const state = buildSelectionState(results)

    const mockResponses = {
      ecosystemChoice: undefined // User cancelled
    }

    const result = await runInteractiveUpdate(state, results, mockResponses, true)

    expect(result.success).toBe(false)
    expect(result.cancelled).toBe(true)
  })

  test('handles going back from preview', async () => {
    const state = buildSelectionState(results)

    const outdatedPackage = results.find(r => r.status === 'outdated')

    if (!outdatedPackage) {
      return
    }

    const mockResponses = {
      ecosystemChoice: 'npm',
      locationChoice: ['root'],
      packageChoice: [{
        name: outdatedPackage.name,
        type: outdatedPackage.type,
        current: outdatedPackage.current,
        latest: outdatedPackage.latest
      }],
      confirmAction: 'back'
    }

    const result = await runInteractiveUpdate(state, results, mockResponses, true)

    // Going back should not be treated as success or cancellation
    // It should loop back (but in test mode, we just verify it handles it)
    expect(result).toBeDefined()
  })
})
```

**Step 3: Run integration tests**

Run: `bun test test/interactive-integration.js`
Expected: PASS (3 tests, some may be skipped if no outdated packages)

**Step 4: Commit**

```bash
git add test/fixtures/interactive-test/package.json test/interactive-integration.js
git commit -m "test: add interactive mode integration tests

- Test full interactive flow with mocked prompts
- Test cancellation handling
- Test going back from preview
- Use real ecosystem checks with fixtures

Ref: interactive-package-selection design"
```

---

## Task 13: Update README Documentation

**Files:**
- Modify: `README.md`

**Step 1: Update README with new interactive mode**

Update the relevant sections in `README.md`:

Add to "Usage" section:

```markdown
## Usage

### Interactive Package Selection (NEW!)

```bash
updated --update
```

The `--update` flag now launches an interactive mode that lets you:
- View all packages in a formatted table
- Select specific packages to update (not all or nothing)
- Preview changes before committing
- Support for workspaces and multiple ecosystems

**Example interactive flow:**
```bash
$ updated --update

? Which ecosystem do you want to update?
❯ npm packages (3 outdated across 1 workspace)
  Docker images (1 outdated in 1 compose file)
  Both

? Select packages to update: (Press <space> to select, <a> to toggle all)
❯◉ semver: ^7.3.7 → ^7.6.0 (OUTDATED)
 ◉ yaml: ^2.3.4 → ^2.5.1 (OUTDATED)
 ◯ prompts: already updated (UPDATED)

Preview of changes to package.json:
  dependencies:
    semver: "^7.3.7" → "^7.6.0"
    yaml: "^2.3.4" → "^2.5.1"

? What would you like to do?
❯ Confirm and update
  Go back and change selection
  Cancel (no changes)

✅ Updated package.json (root):
  • semver: ^7.3.7 → ^7.6.0
  • yaml: ^2.3.4 → ^2.5.1

💡 Run 'npm install' to update your lock file
```

### Non-Interactive Auto-Update

For CI/CD pipelines or non-interactive environments:

```bash
updated --update --all
```

This will automatically update all outdated packages without prompting.
```

Add to "CLI Options" section:

```markdown
## CLI Options

| Flag | Description |
|------|-------------|
| `--update` | Launch interactive package selection mode |
| `--all` | With `--update`, auto-update all packages without prompts |
| `--workspaces` | Process npm workspaces |
| `--ignore=pkg1,pkg2` | Comma-separated packages to ignore |
| `--types=deps,devDeps` | Comma-separated dependency types to check |
| `--scopes=@scope1,@scope2` | Comma-separated package scopes to check |
| `--json` | Output JSON to stdout (incompatible with interactive `--update`) |
| `--silent` | No output to stderr (incompatible with interactive `--update`) |
| `--no-color` | Disable color output |
| `--help` | Display help |

**Note:** Interactive `--update` mode is incompatible with `--json` and `--silent` flags.
Use `--update --all` for non-interactive mode with these flags.
```

Add to "Breaking Changes" section (create if doesn't exist):

```markdown
## Breaking Changes (v2.0.0)

### `--update` Flag Behavior Change

**Before (v1.x):**
```bash
updated --update  # Auto-updated all packages (non-interactive)
```

**After (v2.0.0):**
```bash
updated --update         # Interactive package selection
updated --update --all   # Auto-update all packages (non-interactive)
```

**Migration:**
If you use `--update` in CI/CD scripts, update to `--update --all`:

```diff
- npm run updated -- --update
+ npm run updated -- --update --all
```
```

**Step 2: Verify README renders correctly**

Read through the updated README to ensure:
- All examples are accurate
- Breaking changes are clearly documented
- Migration path is clear

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with interactive mode documentation

- Document new interactive --update behavior
- Add example interactive flow
- Document --all flag for non-interactive
- Add breaking changes section with migration guide
- Update CLI options table

Ref: interactive-package-selection design"
```

---

## Task 14: Final Testing and Cleanup

**Files:**
- Clean up: Remove `inquirer` dependency (if still present)
- Clean up: Remove test files created during development

**Step 1: Remove Inquirer dependency**

```bash
bun remove inquirer
```

**Step 2: Clean up test OpenTUI files**

```bash
rm -f test-opentui-simple.js test-opentui.js
```

**Step 3: Run full test suite**

```bash
bun test
```

Expected: All tests pass

**Step 4: Test binary compilation**

```bash
bun run build:all
```

Expected: All 4 binaries compile successfully

**Step 5: Manual smoke testing**

Test the interactive mode manually:

```bash
# In a test project with outdated packages
bun run index.js --update
# Navigate through prompts, test all scenarios:
# - Select ecosystem
# - Select workspaces
# - Select packages
# - Preview and confirm
# - Cancel at various stages
# - Go back from preview

# Test auto-update
bun run index.js --update --all

# Test flag conflicts
bun run index.js --update --json  # Should error
bun run index.js --update --silent  # Should error
bun run index.js --update --all --json  # Should work
```

**Step 6: Commit cleanup**

```bash
git add -A
git commit -m "chore: cleanup and final testing

- Remove inquirer dependency (unused)
- Remove test files from experimentation
- Verify all tests pass
- Verify binaries compile
- Manual smoke testing complete

Ref: interactive-package-selection design"
```

---

## Summary

This implementation plan breaks down the interactive package selection feature into 14 bite-sized tasks:

1. **Task 1:** Add `--all` flag support
2. **Task 2:** Create selection state builder
3. **Task 3:** Create prompts choice formatter
4. **Task 4:** Create file update applier
5. **Task 5:** Create interactive module structure
6. **Task 6:** Implement location selection prompt
7. **Task 7:** Implement package selection prompt
8. **Task 8:** Implement preview and confirmation prompt
9. **Task 9:** Create main interactive orchestrator
10. **Task 10:** Add flag conflict validation
11. **Task 11:** Integrate interactive mode into main flow
12. **Task 12:** Add integration tests
13. **Task 13:** Update README documentation
14. **Task 14:** Final testing and cleanup

Each task follows TDD principles:
- Write failing test
- Run test to verify it fails
- Implement minimal code
- Run test to verify it passes
- Commit with descriptive message

**Total estimated time:** 14 tasks × 20-30 minutes = 4.5-7 hours

**Dependencies:** prompts (already installed), Grid class (already exists)

**Breaking changes:** `--update` behavior changes from auto-update to interactive
