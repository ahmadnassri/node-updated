# Updated

check for updated package.json dependencies

[![license][license-img]][license-url]
[![release][release-img]][release-url]
[![semantic][semantic-img]][semantic-url]

## Motivation

While there are [many package dependency checking tools][], they all come with some gotchas:

- **additional dependencies**:
  While having dependencies for a CLI package is not uncommon, the dependencies themselves can fall behind as maintainers struggle to keep up with upstream changes.

- **exit codes & standard streams**:
  some solutions do not use proper exit codes *(e.g. `0` for success `1` for failure)* and rely on `console.log` for all outputs instead of properly streaming results to `stdout` and `stderr`. This makes them incompatible for usage within a CI process.

- **[`npm outdated`][]**
  `npm`'s `outdated` command seems to attempt to address some of the basics, however, it only works for production `dependencies` *(and `devDependencies` if you add the hidden `-D` flag!)* but not both at the same time!
  `optionalDependencies` and `peerDependencies` are not included.

This utility addresses these issues **by using the npm registry API directly with a Bun-native implementation**, which:

- Works as a standalone binary without requiring Bun, Node.js, or npm to be installed
- Properly handles `.npmrc` configuration, authentication, and custom registries
- Built with [Bun](https://bun.sh) for superior performance and smaller bundle sizes
- Maintains proper exit codes and standard streams for CI compatibility
- Blazingly fast startup and execution times

**Hopefully, `npm outdated` will evolve and make this tool irrelevant!**

## CAVEATS

The following types of packages are not supported:

- `<git-host>:<git-user>/<repo-name>`
- `<git repo url>`
- `<tarball file>`
- `<tarball url>`
- `<folder>`

## Features

- **Asynchronous**
  runs each package check asynchronously, with immediate feedback to `stdout`

- **Minimal dependencies**
  uses `npm-registry-fetch` (the official npm registry client) and `semver` to keep the package lean for CI use.

- **Zero Dependencies**
  standalone binaries work without requiring Bun, Node.js, or npm to be installed - download and run.

- **Proper authentication**
  automatically reads `.npmrc` configuration for authentication tokens and custom registries, supporting private packages and scoped registries.

- **CI friendly**
  through proper usage of standard streams *(`stdout`, `stderr`)* and exit codes.

- **configurable**
  use simple [arguments][] to control behaviour.

- **compares against `package.json`**
  `updated` will **ONLY** look at `package.json` and query the registry with the **same version ranges** you define, to better simulate what `npm install` will produce and avoid pointless errors.

  > ***e.g.** `updated@^1.0.0` is still valid if the latest is `updated@^1.0.1` because `npm install` will grab the latter.*

## Install

### Binary Download (Recommended)

Download the standalone binary for your platform from the [latest release](https://github.com/ahmadnassri/node-updated/releases/latest):

**Linux x64:**
```bash
curl -L https://github.com/ahmadnassri/node-updated/releases/latest/download/updated-linux-x64 -o updated
chmod +x updated
./updated
```

**macOS (Apple Silicon):**
```bash
curl -L https://github.com/ahmadnassri/node-updated/releases/latest/download/updated-darwin-arm64 -o updated
chmod +x updated
./updated
```

**macOS (Intel):**
```bash
curl -L https://github.com/ahmadnassri/node-updated/releases/latest/download/updated-darwin-x64 -o updated
chmod +x updated
./updated
```

**Windows:**
Download `updated-windows-x64.exe` from the releases page and run it.

### npm Install

```bash
npm install -g updated
updated
```

> **Note**: The npm package includes a postinstall script that downloads the appropriate binary for your platform.

## Usage

### Check for outdated packages

Run in your project's folder with `package.json`:

``` bash
$ updated

DEPRECATED      connect: ^2.30.1                                        ^2.30.1 → 3.7.0
NOT-SUPPORTED   @ahmadnassri/node-create: ahmadnassri/node-create
NOT-SUPPORTED   nothingness: github:othiym23/nothingness#master
OUTDATED        once: ^1.3.1                                            ^1.3.1 → 1.4.0
DEPRECATED      @telusdigital/nightwatch-seo: *                         * → 1.2.2
OUTDATED        npm: ^3.5.1                                             ^3.5.1 → 6.14.7
```

### Interactive mode (new in v4.0.0)

Use `--update` to interactively select packages to update:

``` bash
$ updated --update

? Which ecosystem would you like to update? › npm
? Where would you like to update packages? ›
  ◻ root
  ◻ packages/api
  ◻ packages/web

? Select packages to update: ›
  ◉ once: ^1.3.1 → 1.4.0
  ◻ npm: ^3.5.1 → 6.14.7
  ◻ semver: ^7.3.7 → 7.6.3

Preview of changes:
  1 package selected for update

  root:
    once: ^1.3.1 → 1.4.0

? Continue with update? › (Use arrow keys)
  › Yes, update package.json files
    No, go back to package selection
    Cancel
```

The interactive mode allows you to:
- Filter by ecosystem (npm, docker, github-actions)
- Filter by workspace/location
- Select specific packages to update
- Preview changes before applying
- Navigate back to change selections

### Non-interactive auto-update

Use `--update --all` to automatically update all outdated packages without prompting:

``` bash
$ updated --update --all

Updated 3 packages:
  once: ^1.3.1 → 1.4.0
  npm: ^3.5.1 → 6.14.7
  semver: ^7.3.7 → 7.6.3
```

This is useful for automated scripts and CI/CD pipelines.

> ***Tip**: You can check the last exit code by running `echo $?`*
>
> ***Tip**: You don't need to install this package or add it to your dependencies, just run `npx updated`*

## CLI Options

> Options are applied using `--[option]=[value]` syntax

| Options      | Default     | Description                                                                                  |
|--------------|-------------|----------------------------------------------------------------------------------------------|
| `workspaces` | `false`     | process workspaces                                                                           |
| `ignore`     | ` `         | comma-separated packages to be ignored, *e.g. `--ignore=tap,eslint`*                         |
| `types`      | *see below* | comma-separated dependency types to check, *e.g. `--types=devDependencies,peerDependencies`* |
| `scopes`     | `all`       | comma-separated list of package `@scopes` to check, default checks all                       |
| `update`     | `false`     | **BREAKING CHANGE**: launch interactive mode to select and update packages (v4.0.0+)         |
| `all`        | `false`     | auto-update all outdated packages without prompting (requires `--update`)                    |
| `json`       | `false`     | output JSON results to `stdout` (incompatible with `--update`)                               |
| `silent`     | `false`     | do not output report on `stderr` (incompatible with `--update`)                              |
| `no-color`   | `false`     | disable color output                                                                         |
| `help`       | `N/A`       | display cli help                                                                             |

### Dependency Types

By default `updated` will check for the following types in your `package.json`

- dependencies
- devDependencies
- optionalDependencies
- peerDependencies

> **Note**: dependency types is an arbitrary string value, your `package.json` can contain additional types beyond the ones listed here, just include them using `--types` and updated will attempt to check their status.

## Breaking Changes

### Version 4.0.0: Interactive Mode

The `--update` flag behavior has changed in v4.0.0:

**Before v4.0.0:**
- `--update` would automatically update ALL outdated packages without prompting

**After v4.0.0:**
- `--update` launches an interactive mode where you can select which packages to update
- `--update --all` automatically updates all outdated packages (equivalent to old behavior)

#### Migration Guide

If you were using `--update` in CI/CD pipelines or automated scripts:

**Old command:**
```bash
updated --update
```

**New command (for same behavior):**
```bash
updated --update --all
```

**Why this change?**
The new interactive mode provides better control over package updates, allowing you to:
- Review each package before updating
- Select specific packages to update
- Preview changes before applying
- Filter by ecosystem and workspace

For automated environments, the `--all` flag preserves the original behavior.

## Exit Codes

| Code | Description |
|------|-------------|
| `0`  | success     |
| `1`  | failure     |

## Development

### Requirements

- **Bun** >=1.0.0

### Setup

```bash
git clone https://github.com/ahmadnassri/node-updated.git
cd node-updated
bun install
```

### Testing

```bash
bun test              # Run all tests
bun test --watch      # Watch mode
```

### Building Binaries

```bash
bun run build         # Build all platforms
bun run build:linux   # Build Linux only
bun run build:macos-arm  # Build macOS ARM64 only
bun run build:macos-x64  # Build macOS Intel only
bun run build:windows    # Build Windows only
```

Binaries are output to `dist/` directory.

  [many package dependency checking tools]: https://www.npmjs.com/search?q=check%20updates
  [`npm outdated`]: https://docs.npmjs.com/cli/outdated
  [arguments]: #options

----
> Author: [Ahmad Nassri](https://www.ahmadnassri.com/) &bull;
> Twitter: [@AhmadNassri](https://twitter.com/AhmadNassri)

[license-url]: LICENSE
[license-img]: https://badgen.net/github/license/ahmadnassri/node-updated

[release-url]: https://github.com/ahmadnassri/node-updated/releases
[release-img]: https://badgen.net/github/release/ahmadnassri/node-updated

[semantic-url]: https://github.com/ahmadnassri/node-updated/actions?query=workflow%3Arelease
[semantic-img]: https://badgen.net/badge/📦/semantically%20released/blue
