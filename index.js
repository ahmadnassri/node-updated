#!/usr/bin/env node

import module from 'node:module'

// process cli args
import cliArguments from './lib/args.js'

// load exception handlers
import './lib/uncaught.js'

// modules
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'

import Grid from './lib/grid.js'
import { magenta, cyan, red, green, gray, light } from './lib/colors.js'

// Ecosystem support
import NpmEcosystem from './lib/ecosystems/npm/index.js'
import parse from './lib/ecosystems/npm/parser.js'

// Ecosystem registry
const ecosystems = {
  npm: NpmEcosystem
}

/**
 * Detect available ecosystems based on manifest files
 * @returns {Array<string>} Array of ecosystem names
 */
function detectEcosystems () {
  const detected = []

  for (const [name, EcosystemClass] of Object.entries(ecosystems)) {
    const manifestFiles = EcosystemClass.manifestFiles

    for (const manifestFile of manifestFiles) {
      try {
        const fullPath = join(process.cwd(), manifestFile)
        require.resolve(fullPath)
        if (!detected.includes(name)) {
          detected.push(name)
        }
      } catch {
        // Manifest file doesn't exist
      }
    }
  }

  return detected
}

const require = module.createRequire(import.meta.url)

console.time('completed in')

// construct full path to package.json
const filename = join(process.cwd(), 'package.json')

// check for workspaces in root package.json
const workspaces = require(filename).workspaces || []

/**
 *
 * @param filename
 * @param workspace
 */
async function main (filename, workspace) {
  // read package.json
  const packageJson = require(filename)

  // process package.json
  const dependencies = parse(packageJson, cliArguments)

  let exitCode = false
  let updated = false

  const data = []
  const grid = new Grid()

  // Create ecosystem instance
  const ecosystem = new NpmEcosystem()

  for (const dependency of dependencies) {
    // check dependency
    let result = await ecosystem.check(dependency)

    // exit early
    if (!result) continue

    // specify which workspace we are in
    if (workspace) result = { ...result, workspace }

    // store for later
    data.push(result)

    // destruct to write output grid
    let { status, name, type, current, latest } = result

    // send non-zero signal?
    if (status !== 'not-supported') exitCode = true

    // should we update the package.json data?
    if (status === 'outdated' && latest && cliArguments.update) {
      // write to package.json data
      packageJson[type][name] = `^${latest}`

      // reflect in the log
      status = 'updated'

      // flag to update the file
      updated = true
    }

    // convert to upper case
    status = status.toUpperCase()

    grid.row([
      ['NOT-SUPPORTED', 'NOT-FOUND'].includes(status) ? red(status) : magenta(status),
      `${name}${light(':')} ${gray(current)}`,
      latest ? `${cyan(current)} → ${green(latest)}` : null
    ])
  }

  if (!cliArguments.silent && !cliArguments.json) grid.render()

  if (cliArguments.update) {
    // empty line
    console.error()

    // don't fail!
    exitCode = false

    if (updated) {
      await writeFile(filename, JSON.stringify(packageJson, null, 2) + '\n')

      console.error(gray('package.json updated'), red('you should run'), 'npm install', red('to refresh your package-lock.json file'))
    } else {
      console.error(gray('nothing to update'))
    }
  }

  // convert boolean to number
  return { exitCode, data }
}

const exitCodes = []
const json = []

if (cliArguments.workspaces) {
  for (const workspace of ['.', ...workspaces]) {
    if (!cliArguments.json) console.log('processing workspace:', workspace === '.' ? 'root' : workspace)

    // construct full path to package.json
    const filename = join(process.cwd(), workspace, 'package.json')

    // process dependencies
    const { exitCode, data } = await main(filename, workspace)

    json.push(...data)
    exitCodes.push(Number(exitCode))
  }
} else {
  const { exitCode, data } = await main(filename)

  json.push(...data)
  exitCodes.push(Number(exitCode))
}

if (cliArguments.json) process.stdout.write(JSON.stringify(json))

if (!cliArguments.silent) console.timeEnd('completed in')

/* eslint n/no-process-exit: off */
process.exit(Math.max(...exitCodes))
