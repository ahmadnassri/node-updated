# updated

[![license][license-img]][license-url]
[![version][npm-img]][npm-url]
[![super linter][super-linter-img]][super-linter-url]
[![test][test-img]][test-url]
[![release][release-img]][release-url]

[license-url]: LICENSE
[license-img]: https://badgen.net/github/license/ahmadnassri/node-updated

[npm-url]: https://www.npmjs.com/package/updated
[npm-img]: https://badgen.net/npm/v/updated

[super-linter-url]: https://github.com/ahmadnassri/node-updated/actions?query=workflow%3Asuper-linter
[super-linter-img]: https://github.com/ahmadnassri/node-updated/workflows/super-linter/badge.svg

[test-url]: https://github.com/ahmadnassri/node-updated/actions?query=workflow%3Atest
[test-img]: https://github.com/ahmadnassri/node-updated/workflows/test/badge.svg

[release-url]: https://github.com/ahmadnassri/node-updated/actions?query=workflow%3Arelease
[release-img]: https://github.com/ahmadnassri/node-updated/workflows/release/badge.svg 

> check for updated `package.json` dependencies

## Motivation

While there are [many package dependency checking tools][1], they all come with some gotchas:

- **cli dependencies**:  
  While having dependencies for a CLI package is not an issue in itself, the dependencies themselves often come with vulnerabilities, and will inevitably fall behind as maintainers are not able to keep up with upstream changes.

- **npm API dependency**:  
  This means figuring out which `.npmrc` to parse, how to parse it meaningfully, essentially repeating `npm` cli's own logic, this gets complicated when your `.npmrc` file mixes multiple registries and scopes!

- **exit codes & standard streams**:  
  some of the solutions do not use proper exit codes _(e.g. `0` for success `1` for failure)_ and rely on `console.log` for all outputs instead of properly streaming results to `stdout` and `stderr`. This makes them incompatible for usage within a CI process.

- **[`npm outdated`][2]**  
  `npm`'s `outdated` command seems to attempt to address some of the basics, however, it seems to only work for production `dependencies` _(and `devDependencies` if you add the hidden `-D` flag!)_ and not at the same time! 
  `optionalDependencies`, `peerDependencies` are not included.

This utility opposes those two key issues **by using the `npm` cli** directly to inspect each dependency in your `package.json`!

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

- **ZERO dependencies**  
  keeping this package lean for use with CI.

- **uses `npm`**  
  uses the `npm show` cli command directly, which allows matching your actual `npm` environment and project config.

- **CI friendly**  
  through proper usage of standard streams _(`stdout`, `stderr`)_ and exit codes.

- **configurable**
  use simple [arguments](#options) to control behaviour.

- **compares against `package.json`**  
  `updated` will **ONLY** look at `package.json` and query npm with the **same version ranges** you define, to better simulate what `npm install` will produce. and avoid pointless errors.  
  > _**e.g.** `updated@^1.0.0` is still valid if the latest is `updated@^1.0.1` because `npm install` will grab the latter._

## Install

```bash
npm install updated
```

## Usage

Run in your project's folder with `package.json`:

```bash
$ updated

DEPRECATED      connect: ^2.30.1                                        ^2.30.1 → 3.7.0
NOT-SUPPORTED   @ahmadnassri/node-create: ahmadnassri/node-create
NOT-SUPPORTED   nothingness: github:othiym23/nothingness#master
OUTDATED        once: ^1.3.1                                            ^1.3.1 → 1.4.0
DEPRECATED      @telusdigital/nightwatch-seo: *                         * → 1.2.2
OUTDATED        npm: ^3.5.1                                             ^3.5.1 → 6.14.7
```

> _**Tip**: You can check the last exit code by running `echo $?`_  
>
> _**Tip**: You don't need to install this package or add it to your dependencies, just run `npx updated`_

## CLI Options

> Options are applied using `--[option]=[value]` syntax

| Options    | Default     | Description                                                                                  |
| ---------- | ----------- | -------------------------------------------------------------------------------------------- |
| `ignore`   | ` `         | comma-separated packages to be ignored, _e.g. `--ignore=tap,eslint`_                         |
| `types`    | _see below_ | comma-separated dependency types to check, _e.g. `--types=devDependencies,peerDependencies`_ |
| `scopes`   | `all`       | comma-separated list of package `@scopes` to check, default checks all                       |
| `update`   | `false`     | force update `package.json` to latest versions                                               |
| `json`     | `false`     | output JSON results to `stdout`                                                              |
| `silent`   | `false`     | do not output report on `stderr`                                                             |
| `no-color` | `false`     | disable color output                                                                         |
| `help`     | `N/A`       | display cli help                                                                             |

### Dependency Types

By default `updated` will check for the following types in your `package.json`

- dependencies
- devDependencies
- optionalDependencies
- peerDependencies

> **Note**: dependency types is an arbitrary string value, your `package.json` can contain additional types beyond the ones listed here, just include them using `--types` and updated will attempt to check their status.

## Exit Codes

| Code | Description |
| ---- | ----------- |
| `0`  | success     |
| `1`  | failure     |

[1]: https://www.npmjs.com/search?q=check%20updates

[2]: https://docs.npmjs.com/cli/outdated
