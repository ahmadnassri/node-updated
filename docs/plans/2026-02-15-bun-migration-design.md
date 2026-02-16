# Bun Migration Design

**Date**: 2026-02-15
**Author**: Ahmad Nassri
**Status**: Approved

## Context

The `updated` CLI tool currently runs on Node.js (>=24) and checks for outdated npm packages and Docker images. While functional, the current implementation requires users to have Node.js installed and relies on npm's distribution model.

**Motivation for Migration**:
- **Performance**: Leverage Bun's faster startup time and execution
- **Distribution**: Create standalone binaries that users can download and run without installing Node.js/Bun
- **Bundle Size**: Optimize and reduce overall package size through Bun's superior bundling
- **Developer Experience**: Utilize Bun's modern tooling, faster test runner, and simpler APIs

This migration will transform the codebase into a Bun-native application while maintaining all existing functionality and CLI compatibility.

## Approach: Bun-Native Rewrite

After evaluating three approaches (minimal migration, hybrid, and native rewrite), we chose the **Bun-Native Rewrite** approach for maximum optimization and long-term benefits.

### Goals

1. Replace all Node.js APIs with Bun-native equivalents
2. Reimplement npm-registry-fetch using Bun.fetch() for full control
3. Migrate to Bun's test runner (Jest-compatible)
4. Compile standalone binaries for 4 platforms: Linux x64, macOS ARM64, macOS x64, Windows x64
5. Maintain backward compatibility in CLI interface and functionality

## Architecture Overview

**Preserved Structure**:
- Ecosystem pattern (`NpmEcosystem`, `DockerEcosystem`) - solid abstraction, keep it
- CLI entry point: `index.js`
- Library organization: `lib/` directory structure
- Module architecture: No structural changes

**Dependency Changes**:
- **Remove**: `npm-registry-fetch` (replace with custom Bun implementation)
- **Keep**: `semver`, `yaml`, `prompts` (pure JS, Bun-compatible)
- **Update**: package.json engines to require Bun >=1.0.0

## Core API Replacements

### File System Operations

**Before** (Node.js):
```javascript
import { readFile, writeFile } from 'node:fs/promises'
const content = await readFile(path, 'utf8')
await writeFile(path, data)
```

**After** (Bun):
```javascript
const content = await Bun.file(path).text()
await Bun.write(path, data)
```

**Files to Update**:
- `index.js`: Lines 26-30 (package.json reading), 110 (writeFile)
- `lib/ecosystems/npm/index.js`: Lines 17-24 (readFile usage)
- `lib/ecosystems/docker/parser.js`: yaml file reading

### Module Loading

**Before** (Node.js):
```javascript
import module from 'node:module'
const require = module.createRequire(import.meta.url)
const pkg = require(filename)
```

**After** (Bun):
```javascript
const pkg = await Bun.file(filename).json()
```

**Files to Update**:
- `index.js`: Lines 22, 30, 51 (remove createRequire, use Bun.file().json())

### Path Operations

**Keep as-is**: `import { join } from 'node:path'` works in Bun, no changes needed

### Process Operations

**Keep as-is**: `process.cwd()`, `process.exit()`, `console.time()` all work in Bun

## npm Registry Client Replacement

This is the most critical change. We're replacing `npm-registry-fetch` with a custom Bun-native implementation.

### Current Implementation

File: `lib/ecosystems/npm/registry.js`
Uses: `npm-registry-fetch` package
Handles: Registry queries, authentication, .npmrc parsing

### New Implementation

**New File**: `lib/ecosystems/npm/registry-client.js`

**Components**:

#### 1. .npmrc Parser
```javascript
// Read and parse .npmrc files from multiple locations
// - ~/.npmrc (user config)
// - /etc/npmrc (global config)
// - project/.npmrc (project config)
// Parse key=value format, extract:
//   - registry URL
//   - auth tokens (//registry.url/:_authToken)
//   - scope-specific registries (@scope:registry)
```

#### 2. Registry URL Builder
```javascript
// Default: https://registry.npmjs.org
// Handle scoped packages: @scope/package → check @scope:registry
// Build URLs: ${registry}/${package} or ${registry}/${package}/${version}
```

#### 3. HTTP Client (Bun.fetch)
```javascript
async function fetchRegistry(url, authToken) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Authorization': authToken ? `Bearer ${authToken}` : undefined,
      'User-Agent': 'updated (https://github.com/ahmadnassri/node-updated)'
    }
  })

  if (!response.ok) {
    if (response.status === 404) throw new NotFoundError()
    if (response.status === 401 || response.status === 403) throw new AuthError()
    throw new Error(`Registry error: ${response.statusText}`)
  }

  return response.json()
}
```

#### 4. Error Handling
- 404 → `{ status: 'not-found' }`
- 401/403 → `{ status: 'error', error: 'Authentication required' }`
- Network errors → `{ status: 'error', error: message }`

**Simplifications** (can add later if needed):
- No retry logic initially
- No proxy support initially
- No certificate pinning
- Focus on core use case: public npm + private registries with token auth

**File to Replace**:
- `lib/ecosystems/npm/registry.js` - complete rewrite

## Testing Migration

### Current State
- Uses Node.js built-in test runner (`node:test`)
- 9 test files in `test/**/*.js`
- Uses `assert` module for assertions

### New State (Bun Test Runner)

**Syntax Changes**:

**Before**:
```javascript
import { test, describe } from 'node:test'
import assert from 'node:assert'

test('should check outdated package', async () => {
  assert.strictEqual(result.status, 'outdated')
  assert.ok(result.latest)
})
```

**After**:
```javascript
// No imports needed - test, describe, expect are global in Bun

test('should check outdated package', async () => {
  expect(result.status).toBe('outdated')
  expect(result.latest).toBeTruthy()
})
```

**Files to Update**:
- All 9 files in `test/**/*.js`
- Remove `node:test` and `node:assert` imports
- Convert all assertions to `expect()` syntax

**Benefits**:
- Faster test execution
- Better error messages with diffs
- Jest-compatible syntax (familiar to most developers)
- Built-in watch mode: `bun test --watch`

## Build & Compilation

### Bun's Compilation Feature

Bun can bundle your application and the Bun runtime into a single standalone executable.

**Command Format**:
```bash
bun build --compile --target=<platform> ./index.js --outfile <output>
```

**Target Platforms**:
- `bun-linux-x64` → Linux x64
- `bun-darwin-arm64` → macOS Apple Silicon (M1/M2/M3)
- `bun-darwin-x64` → macOS Intel
- `bun-windows-x64` → Windows x64

### Build Scripts

**package.json**:
```json
{
  "scripts": {
    "build": "bun run build:all",
    "build:all": "bun run build:linux && bun run build:macos-arm && bun run build:macos-x64 && bun run build:windows",
    "build:linux": "bun build --compile --target=bun-linux-x64 ./index.js --outfile dist/updated-linux-x64",
    "build:macos-arm": "bun build --compile --target=bun-darwin-arm64 ./index.js --outfile dist/updated-darwin-arm64",
    "build:macos-x64": "bun build --compile --target=bun-darwin-x64 ./index.js --outfile dist/updated-darwin-x64",
    "build:windows": "bun build --compile --target=bun-windows-x64 ./index.js --outfile dist/updated-windows-x64.exe"
  }
}
```

**Cross-Compilation**:
- Bun supports building for all platforms from any host OS
- Can build all 4 binaries from a single CI/CD runner
- Output directory: `dist/` (add to `.gitignore`)

**Binary Characteristics**:
- Size: ~40-60MB per binary (includes Bun runtime)
- Self-contained: No dependencies required
- Portable: Can be distributed as-is

## Distribution Strategy

### GitHub Releases

**Primary Distribution Method**:
- Attach all 4 binaries to each GitHub release
- Naming: `updated-{platform}-{arch}` (e.g., `updated-linux-x64`)
- Users download for their platform and run directly

### npm Package (Secondary)

**Keep npm package as binary wrapper**:
- Package remains on npm for discoverability and backward compatibility
- Contains postinstall script that downloads appropriate binary
- `npm install -g updated` still works
- Similar to how `esbuild` distributes binaries

**Benefits**:
- Maintains npm ecosystem presence
- Users familiar with npm can still use it
- Automatic platform detection and binary download

### Installation Methods

**Manual Download**:
```bash
# Download from GitHub releases
curl -L https://github.com/ahmadnassri/node-updated/releases/latest/download/updated-linux-x64 -o updated
chmod +x updated
./updated
```

**npm Install** (via wrapper):
```bash
npm install -g updated
updated
```

## Development Workflow Changes

### Environment Setup

**Requirements**:
- Bun >=1.0.0 (already installed ✓)
- Remove Node.js requirement

### package.json Changes

```json
{
  "type": "module",
  "engines": {
    "bun": ">=1.0.0"
  },
  "bin": "index.js",
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:ci": "bun test",
    "build": "bun run build:all",
    "dev": "bun run index.js"
  }
}
```

### Docker Compose Updates

**Current**: Uses `node:latest` images
**New**: Use `oven/bun:latest` images

**File**: `compose.yml`
```yaml
services:
  app:
    profiles: ["app"]
    image: oven/bun:latest  # Changed from node:latest
    working_dir: /usr/src/lib
    entrypoint: bun  # Changed from npm
    # ... rest remains same
```

Update test services similarly.

### CI/CD Changes

**GitHub Actions Workflow Updates**:
- Replace Node.js setup with Bun installation
- Update test commands to `bun test`
- Add build step to compile all 4 binaries
- Upload binaries as release artifacts
- Semantic release handles versioning

## Critical Files to Modify

### High Priority (Core Changes)

1. **index.js** - Main entry point
   - Remove `createRequire` usage (lines 22, 30, 51)
   - Replace with `Bun.file().json()`
   - Replace `writeFile` with `Bun.write()` (line 110)

2. **lib/ecosystems/npm/registry.js** - Complete rewrite
   - Create new `registry-client.js` implementation
   - Implement .npmrc parser
   - Implement Bun.fetch-based HTTP client

3. **lib/ecosystems/npm/index.js** - File I/O updates
   - Replace `readFile` with `Bun.file()` (lines 17-24)

4. **lib/ecosystems/docker/parser.js** - File I/O updates
   - Replace `readFile` for YAML files with `Bun.file()`

### Medium Priority (Testing)

5-13. **test/**/*.js** (9 files) - Test migration
   - Remove `node:test` and `node:assert` imports
   - Convert to `expect()` syntax

### Low Priority (Configuration)

14. **package.json** - Update scripts and engines
15. **compose.yml** - Update Docker images to Bun
16. **README.md** - Update installation instructions
17. **.gitignore** - Add `dist/` directory

## Verification & Testing

### Unit Tests
```bash
bun test
# All tests should pass with Bun test runner
```

### Integration Testing
```bash
# Build all binaries
bun run build:all

# Test each binary
./dist/updated-linux-x64 --help
./dist/updated-linux-x64  # Run in a project with package.json

# Verify output matches current behavior
```

### Platform Testing
- Test binary on actual Linux x64 machine
- Test binary on macOS ARM64 (M1/M2/M3)
- Test binary on macOS Intel
- Test binary on Windows x64

### Functionality Verification
- [ ] Check npm dependencies (public packages)
- [ ] Check npm dependencies (private packages with .npmrc)
- [ ] Check npm dependencies with scoped packages
- [ ] Check Docker images from compose.yml
- [ ] Workspaces support
- [ ] Update mode (--update flag)
- [ ] JSON output (--json flag)
- [ ] All CLI flags work correctly

## Risk Assessment

### High Risk Areas
1. **npm registry client replacement** - Most complex change, handles auth and config
   - Mitigation: Comprehensive testing with public and private registries

### Medium Risk Areas
2. **Binary compilation** - New distribution method
   - Mitigation: Test on all 4 platforms before release

### Low Risk Areas
3. **File I/O replacements** - Straightforward API swaps
4. **Test migration** - Jest-compatible syntax, well-documented

## Success Criteria

- [ ] All unit tests pass with Bun test runner
- [ ] All 4 platform binaries compile successfully
- [ ] Binaries work on target platforms without Bun/Node.js installed
- [ ] npm package functionality preserved (check public packages)
- [ ] Private registry support works (.npmrc with auth tokens)
- [ ] Docker image checking still works
- [ ] CLI interface unchanged (backward compatible)
- [ ] Performance improvement measurable (startup time, execution time)
- [ ] Binary sizes acceptable (~40-60MB)

## Timeline Estimate

- Core API replacements: 2-3 hours
- npm registry client rewrite: 4-6 hours (most complex)
- Test migration: 2-3 hours
- Build setup and testing: 2-3 hours
- Documentation and CI/CD: 1-2 hours

**Total**: 11-17 hours of focused development work

## Future Enhancements

Post-migration optimizations (not in initial scope):
- Add retry logic to registry client
- Add proxy support
- Implement caching for registry responses
- Add progress indicators for slow operations
- Explore Bun-specific optimizations (SQLite for caching, etc.)
