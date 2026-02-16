# Interactive Package Selection Design

**Date:** 2026-02-16
**Status:** Approved
**Author:** Claude (via brainstorming session)

## Goal

Add interactive package selection to the `updated` CLI tool, allowing users to:
- View outdated packages in a table format
- Select specific packages to update (instead of updating all)
- Preview changes before committing
- Handle multiple ecosystems (npm packages + Docker images)
- Support workspaces and multiple compose files

## Architecture & High-Level Flow

### Core Design

The interactive mode will be triggered by `--update` alone (without `--all`). The flow splits into three main phases:

#### 1. Discovery Phase
Scan all ecosystems and locations:
- Check npm packages (root + workspaces if `--workspaces`)
- Check Docker images (all compose files found)
- Group results by ecosystem and location

#### 2. Selection Phase
Guide user through selections using prompts library:
- If multiple ecosystems have updates → ask which to update
- If multiple locations (workspaces/compose files) → ask which location(s)
- Display Grid table with all packages (UPDATED/OUTDATED/DEPRECATED)
- Show prompts multiselect for choosing packages (only updateable items enabled)
- Preview selections and confirm

#### 3. Update Phase
Modify files and display results:
- Update selected packages in respective files (package.json/compose.yml)
- Display success message with list of changes
- Show reminder to run npm/docker commands

### Key Architectural Decisions

- Keep existing Grid class for table display (no changes needed)
- Use prompts library (already a dependency!) for all interactive selections
- Maintain separation between ecosystems (npm vs Docker)
- Each file (workspace or compose) updates independently
- Preserve existing `--update --all` behavior for non-interactive updates

### Implementation Approach

**Selected: Approach 1 - Prompts-based (Lightweight)**

Use the existing `prompts` library for all interactions:
- Display custom Grid table (already built)
- Use `prompts.select()` for ecosystem/workspace/file selection
- Use `prompts.multiselect()` for package selection
- Use `prompts.select()` for preview confirmation

**Why this approach:**
- Zero new dependencies (prompts already installed)
- Lightweight (~10KB vs Inquirer ~150KB)
- Consistent with project philosophy (minimal dependencies)
- Has all needed features (select, multiselect, confirm)

## Detailed User Interaction Flow

### Step-by-Step Flow

When user runs `updated --update`:

#### 1. Initial Discovery
```bash
$ updated --update
Checking for updates...
```
- Scan package.json (+ workspaces if `--workspaces`)
- Scan compose.yml files in project
- Categorize: npm (X outdated in Y locations), Docker (Z outdated in W files)

#### 2. Ecosystem Selection (if both have updates)
```
? Which ecosystem do you want to update?
❯ npm packages (5 outdated across 2 workspaces)
  Docker images (2 outdated in 1 compose file)
  Both
```

#### 3. Location Selection (if multiple locations)

**For npm workspaces:**
```
? Select workspace(s) to update: (Press <space> to select, <a> to toggle all)
❯◉ root (2 outdated)
 ◯ packages/foo (3 outdated)
 All workspaces
```

**For Docker compose files:**
```
? Select compose file(s) to update:
❯◉ compose.yml (1 outdated)
 ◯ services/api/compose.yml (1 outdated)
 All compose files
```

#### 4. Display Table + Package Selection

**First, display the Grid table (read-only view):**
```
┌─📦 npm Packages (root)─────────────────────────────┐
│ semver   │ ^7.3.7 │ ^7.6.0 │ ⚠️  OUTDATED    │
│ prompts  │ ^2.4.2 │ ^2.4.2 │ ✅ UPDATED      │
│ request  │ ^2.88  │ N/A    │ 🚨 DEPRECATED   │
└────────────────────────────────────────────────────┘
```

**Then, prompts multiselect (formatted as simplified list):**
```
? Select packages to update: (Press <space> to select, <a> to toggle all, <enter> to confirm)
❯◉ semver: ^7.3.7 → ^7.6.0 (OUTDATED)
 ◉ request: ^2.88 → remove (DEPRECATED)
 ◯ prompts: already updated (disabled)
```

#### 5. Preview & Confirmation
```
Preview of changes to package.json:

  dependencies:
    semver: "^7.3.7" → "^7.6.0"
    request: "^2.88" → [REMOVED]

? What would you like to do?
❯ Confirm and update
  Go back and change selection
  Cancel (no changes)
```

#### 6. Final Result
```
✅ Updated package.json (root):
  • semver: ^7.3.7 → ^7.6.0
  • request: removed (deprecated)

💡 Run 'npm install' to update your lock file

Completed in 2.3s
```

### Edge Cases

- If user presses Esc/cancels at any prompt → Exit with no changes
- If user selects nothing → Show warning, ask to confirm exit
- If `--update --all` → Skip all prompts, auto-update everything
- If `--update --json` or `--update --silent` → Error: "Interactive mode incompatible with --json/--silent"

### Keyboard Shortcuts

- `↑/↓` - Navigate items
- `Space` - Toggle selection
- `a` - Select all (only updateable items)
- `d` - Deselect all
- `Enter` - Confirm and proceed
- `Esc/q` - Cancel (no updates)

## Data Structures & State Management

### Selection State Structure

Track user selections through the flow:

```javascript
const selectionState = {
  ecosystems: ['npm', 'docker'],  // or ['npm'] or ['docker']

  npm: {
    locations: ['root', 'packages/foo'],  // selected workspaces
    selections: {
      'root': [
        { name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '^7.6.0', action: 'update' },
        { name: 'request', type: 'dependencies', current: '^2.88', latest: null, action: 'remove' }
      ],
      'packages/foo': [...]
    }
  },

  docker: {
    locations: ['compose.yml'],  // selected compose files
    selections: {
      'compose.yml': [
        { service: 'app', image: 'node', current: '20', latest: '22', action: 'update' }
      ]
    }
  }
}
```

### Package Display Format

Each package in the multiselect will include:
- `title`: Display string (e.g., "semver: ^7.3.7 → ^7.6.0 (OUTDATED)")
- `value`: Unique identifier (package name + type)
- `selected`: Initial selection state (default: all outdated = true)
- `disabled`: Cannot be selected (for UPDATED items)

### Prompts Choice Formatting

```javascript
// For each outdated package, create a choice object
{
  title: `${name}: ${current} → ${latest} (${status})`,
  value: { name, type, current, latest },
  selected: true,  // pre-selected if OUTDATED or DEPRECATED
  disabled: status === 'UPDATED'
}
```

### File Update Logic

```javascript
function applyUpdates(filepath, selections) {
  // Read current file
  const data = await Bun.file(filepath).json()

  // Apply each selection
  for (const selection of selections) {
    if (selection.action === 'update') {
      data[selection.type][selection.name] = `^${selection.latest}`
    } else if (selection.action === 'remove') {
      delete data[selection.type][selection.name]
    }
  }

  // Write back to file
  await Bun.write(filepath, JSON.stringify(data, null, 2) + '\n')
}
```

## File Updates & Error Handling

### File Update Strategy

When user confirms selections:

1. **Validate selections first** - Ensure all files are writable, not locked
2. **Update each file atomically** - Read → Modify → Write
3. **Track results** - Count successes/failures per file
4. **Display summary** - Show what changed per file

### Error Handling Scenarios

#### During Discovery

```javascript
// Missing package.json
if (!await Bun.file('package.json').exists()) {
  console.error('❌ No package.json found')
  process.exit(1)
}

// Invalid package.json
try {
  const pkg = await Bun.file('package.json').json()
} catch (error) {
  console.error('❌ Invalid package.json:', error.message)
  process.exit(1)
}
```

#### During Network Requests

```javascript
// Registry timeout or failure
try {
  const latest = await ecosystem.check(dependency)
} catch (error) {
  // Mark as ERROR status, show in table but don't allow selection
  status = 'ERROR'
  latest = null
}
```

#### During File Updates

```javascript
// File write permission errors
try {
  await Bun.write(filepath, content)
  results.success.push(filepath)
} catch (error) {
  console.error(`❌ Failed to update ${filepath}:`, error.message)
  results.failed.push({ filepath, error: error.message })
}

// If any files failed, show partial success message
if (results.failed.length > 0) {
  console.error('\n⚠️  Some files could not be updated:')
  results.failed.forEach(f => console.error(`  • ${f.filepath}: ${f.error}`))
  process.exit(1)
}
```

#### Flag Conflict Validation

```javascript
// Check incompatible flags at startup
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
```

#### User Cancellation Handling

```javascript
// At any prompt, if user cancels (Ctrl+C or Esc)
process.on('SIGINT', () => {
  console.log('\n\n❌ Cancelled by user. No changes made.')
  process.exit(0)
})

// If user selects nothing in multiselect
if (selectedPackages.length === 0) {
  const confirm = await prompts({
    type: 'confirm',
    name: 'exit',
    message: 'No packages selected. Exit without updating?',
    initial: true
  })

  if (confirm.exit) {
    console.log('No changes made.')
    process.exit(0)
  }
  // Otherwise, loop back to selection
}
```

## Testing Strategy

### Test Coverage Areas

#### 1. Unit Tests (prompts interaction mocking)

```javascript
// Test selection state building
describe('buildSelectionState', () => {
  test('groups packages by workspace', () => {
    const packages = [/* outdated packages */]
    const state = buildSelectionState(packages)
    expect(state.npm.locations).toEqual(['root', 'packages/foo'])
  })

  test('filters only updateable packages', () => {
    const packages = [{ status: 'updated' }, { status: 'outdated' }]
    const choices = buildPromptChoices(packages)
    expect(choices[0].disabled).toBe(true)
    expect(choices[1].disabled).toBe(false)
  })
})

// Test file update logic
describe('applyUpdates', () => {
  test('updates package versions in package.json', async () => {
    const selections = [{ name: 'semver', type: 'dependencies', latest: '7.6.0' }]
    await applyUpdates('package.json', selections)
    const pkg = await Bun.file('package.json').json()
    expect(pkg.dependencies.semver).toBe('^7.6.0')
  })

  test('removes deprecated packages', async () => {
    const selections = [{ name: 'request', type: 'dependencies', action: 'remove' }]
    await applyUpdates('package.json', selections)
    const pkg = await Bun.file('package.json').json()
    expect(pkg.dependencies.request).toBeUndefined()
  })
})
```

#### 2. Integration Tests (with fixtures)

```javascript
// Test full interactive flow (mocking prompts responses)
describe('interactive update flow', () => {
  test('updates selected packages only', async () => {
    // Mock prompts to select specific packages
    mockPrompts([
      { response: ['npm'] },           // ecosystem
      { response: ['root'] },          // workspace
      { response: ['semver', 'yaml'] }, // packages
      { response: 0 }                  // confirm
    ])

    await runUpdated(['--update'], fixtureDir)

    const pkg = await Bun.file(join(fixtureDir, 'package.json')).json()
    expect(pkg.dependencies.semver).toBe('^7.6.0')
    expect(pkg.dependencies.yaml).toBe('^2.5.1')
    expect(pkg.dependencies.prompts).toBe('^2.4.2') // unchanged
  })

  test('handles user cancellation gracefully', async () => {
    mockPrompts([
      { cancelled: true } // user presses Esc
    ])

    const result = await runUpdated(['--update'], fixtureDir)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toContain('Cancelled by user')
  })
})
```

#### 3. CLI Tests (existing test suite enhancement)

```javascript
// test/with-update.js - add interactive tests
describe('--update flag', () => {
  test('errors with --json flag', () => {
    const { status, stderr } = spawnSync('bun', ['run', cmd, '--update', '--json'], { cwd })
    expect(status).toBe(1)
    expect(stderr.toString()).toMatch(/Cannot use --json with interactive/)
  })

  test('auto-updates with --all flag', () => {
    const { status } = spawnSync('bun', ['run', cmd, '--update', '--all'], { cwd })
    expect(status).toBe(0)
    // Verify package.json updated without prompts
  })
})
```

#### 4. Manual Testing Checklist

- [ ] Interactive mode with single ecosystem (npm only)
- [ ] Interactive mode with multiple ecosystems (npm + Docker)
- [ ] Workspace selection (select one, select multiple, select all)
- [ ] Package selection (toggle individual, select all, deselect all)
- [ ] Preview and go back to change selection
- [ ] Cancel at each prompt stage
- [ ] Select nothing and exit
- [ ] Deprecated package removal
- [ ] Binary compilation still works (all 4 platforms)
- [ ] Flag conflicts (--json, --silent) show proper errors

### Testing Tools

- Bun test runner (already in use)
- Mock prompts library responses for automated testing
- Fixture directories for integration tests
- Spy on Bun.write() to verify file updates

## Breaking Changes

### Flag Behavior Changes

**Before:**
- `--update` → Auto-updates all outdated packages (non-interactive)

**After:**
- `--update` → Interactive package selection
- `--update --all` → Auto-updates all outdated packages (non-interactive)

**Migration:**
Users who rely on `--update` for non-interactive updates in CI/CD pipelines will need to change to `--update --all`.

## Implementation Files

### New Files
- `lib/interactive.js` - Main interactive mode orchestrator
- `lib/selection.js` - Selection state management
- `test/interactive.js` - Interactive mode tests

### Modified Files
- `index.js` - Add interactive mode entry point
- `lib/args.js` - Add `--all` flag support
- `test/with-update.js` - Update tests for new behavior
- `README.md` - Document new interactive mode

## Success Criteria

- [ ] User can select specific packages to update (not all-or-nothing)
- [ ] Table displays all packages with status (UPDATED/OUTDATED/DEPRECATED)
- [ ] Multi-ecosystem support (npm + Docker)
- [ ] Workspace and compose file selection works
- [ ] Preview shows changes before committing
- [ ] All keyboard shortcuts work (↑/↓/Space/a/d/Enter/Esc)
- [ ] Error handling covers all scenarios
- [ ] Flag conflicts validated (--json, --silent)
- [ ] All tests pass (unit + integration + CLI)
- [ ] Binaries compile for all 4 platforms
- [ ] Documentation updated

## Next Steps

1. Create detailed implementation plan using writing-plans skill
2. Implement in TDD fashion (tests first, then code)
3. Test on real projects with various configurations
4. Update README with examples and breaking changes
5. Release as new major version (breaking change)
