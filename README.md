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

This utility addresses these issues **by using the npm registry API directly via `npm-registry-fetch`**, which:

- Works without requiring npm CLI to be installed
- Properly handles `.npmrc` configuration, authentication, and custom registries
- Uses the same library that npm CLI uses internally for registry access
- Maintains proper exit codes and standard streams for CI compatibility

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

- **Works without npm CLI**
  uses the npm registry API directly, which means it works in any Node.js environment without requiring npm CLI to be installed.

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

``` bash
npm install updated
```

## Usage

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
| `update`     | `false`     | force update `package.json` to latest versions                                               |
| `json`       | `false`     | output JSON results to `stdout`                                                              |
| `silent`     | `false`     | do not output report on `stderr`                                                             |
| `no-color`   | `false`     | disable color output                                                                         |
| `help`       | `N/A`       | display cli help                                                                             |

### Dependency Types

By default `updated` will check for the following types in your `package.json`

- dependencies
- devDependencies
- optionalDependencies
- peerDependencies

> **Note**: dependency types is an arbitrary string value, your `package.json` can contain additional types beyond the ones listed here, just include them using `--types` and updated will attempt to check their status.

## Exit Codes

| Code | Description |
|------|-------------|
| `0`  | success     |
| `1`  | failure     |

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
