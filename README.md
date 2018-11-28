# updated

[![License][license-image]][license-url] [![version][npm-image]][npm-url] [![Build Status][circle-image]][circle-url]

> check for updated package.json dependencies

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
- `<folder`>

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

DEPRECATED      ^2.30.1 → 3.6.6         connect @ ^2.30.1
OUTDATED        ^5.0.15 → 7.1.3         glob @ ^5.0.15
DEPRECATED      * → 1.2.2               @telusdigital/nightwatch-seo @ *
OUTDATED        ^3.5.1 → 6.4.1          npm @ ^3.5.1
```

> _**Tip**: You can check the last exit code by running `echo $?`_  
>
> _**Tip**: You don't need to install this package or add it to your dependencies, just run `npx updated`_

## Options

| Name       | Description                                                                  |
| ---------- | -----------------------------------------------------------------------------|
| `--json`   | output JSON results to `stdout`                                              |
| `--silent` | no output on `stderr`                                                        |
| `--color`  | pretty colors!                                                               |
| `--update` | update `package.json` to latest versions                                     |
| `--ignore` | specify comma-separated packages to be ignored, e.g. `--ignore=tap,eslint`   |

## Exit Codes

| Code | Description |
| ---- | ----------- |
| `0`  | success     |
| `1`  | failure     |

---
> Author: [Ahmad Nassri](https://www.ahmadnassri.com) &bull; 
> Github: [@ahmadnassri](https://github.com/ahmadnassri) &bull; 
> Twitter: [@ahmadnassri](https://twitter.com/ahmadnassri)

[license-url]: LICENSE
[license-image]: https://img.shields.io/github/license/ahmadnassri/node-updated.svg?style=for-the-badge&logo=circleci

[circle-url]: https://circleci.com/gh/ahmadnassri/node-updated
[circle-image]: https://img.shields.io/circleci/project/github/ahmadnassri/node-updated/master.svg?style=for-the-badge&logo=circleci

[npm-url]: https://www.npmjs.com/package/updated
[npm-image]: https://img.shields.io/npm/v/updated.svg?style=for-the-badge&logo=npm

[1]: https://www.npmjs.com/search?q=check%20updates
[2]: https://docs.npmjs.com/cli/outdated
