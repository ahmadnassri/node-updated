#!/usr/bin/env bun

// process cli args
import cliArguments from './lib/args.js'

// load exception handlers
import './lib/uncaught.js'

// modules
import { join } from 'node:path'

import Grid from './lib/grid.js'
import { magenta, cyan, red, green, gray, light } from './lib/colors.js'

// Ecosystem support
import NpmEcosystem from './lib/ecosystems/npm/index.js'
import DockerEcosystem from './lib/ecosystems/docker/index.js'

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

// construct full path to package.json
const filename = join(process.cwd(), 'package.json')

// check for workspaces in root package.json
const rootPackage = await Bun.file(filename).json()
const workspaces = rootPackage.workspaces || []

/**
 *
 * @param filename
 * @param workspace
 */
async function main (filename, workspace) {
  // Create ecosystem instance
  const ecosystem = new NpmEcosystem()

  // Process package.json using ecosystem
  let dependencies
  try {
    dependencies = await ecosystem.parse(cliArguments, filename)
  } catch (error) {
    console.error(red('Error parsing package.json:'), error.message)
    return { exitCode: true, data: [] }
  }

  // read package.json (still needed for update logic)
  const packageJson = await Bun.file(filename).json()

  let exitCode = false
  let updated = false

  const data = []
  const gridTitle = workspace === '.' ? '📦 npm Packages (root)' : workspace ? `📦 npm Packages (${workspace})` : '📦 npm Packages'
  const grid = new Grid(gridTitle)

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

    // Status icons and formatting
    const statusIcons = {
      OUTDATED: '⚠️  ' + magenta('OUTDATED'),
      DEPRECATED: '🚨 ' + red('DEPRECATED'),
      UPDATED: '✅ ' + green('UPDATED'),
      'NOT-SUPPORTED': '❌ ' + red('NOT-SUPPORTED'),
      'NOT-FOUND': '🔍 ' + red('NOT-FOUND'),
      ERROR: '❌ ' + red('ERROR')
    }

    status = status.toUpperCase()
    const statusDisplay = statusIcons[status] || magenta(status)

    grid.row([
      statusDisplay,
      `${name}${light(':')} ${gray(current)}`,
      latest ? `${cyan(current)} ${light('→')} ${green(latest)}` : gray('—')
    ])
  }

  if (!cliArguments.silent && !cliArguments.json) grid.render()

  if (cliArguments.update) {
    // empty line
    console.error()

    // don't fail!
    exitCode = false

    if (updated) {
      await Bun.write(filename, JSON.stringify(packageJson, null, 2) + '\n')

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

// Check npm packages
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

// Check Docker images from compose files
try {
  const dockerEcosystem = new DockerEcosystem()
  const composeFiles = ['compose.yml', 'docker-compose.yml']

  for (const composeFile of composeFiles) {
    const composePath = join(process.cwd(), composeFile)

    try {
      const dependencies = await dockerEcosystem.parse(cliArguments, composePath)

      if (dependencies.length === 0) continue

      const dockerTitle = `🐋 Docker Images (${composeFile})`
      const grid = new Grid(dockerTitle)
      let exitCode = false

      // Status icons for Docker
      const dockerStatusIcons = {
        OUTDATED: '⚠️  ' + magenta('OUTDATED'),
        'NOT-SUPPORTED': '❌ ' + red('NOT-SUPPORTED'),
        'NOT-FOUND': '🔍 ' + red('NOT-FOUND'),
        ERROR: '❌ ' + red('ERROR')
      }

      for (const dependency of dependencies) {
        const result = await dockerEcosystem.check(dependency)

        if (!result) continue

        json.push(result)

        const { status, name, current, latest } = result

        if (status !== 'not-supported') exitCode = true

        const statusUpper = status.toUpperCase()
        const statusDisplay = dockerStatusIcons[statusUpper] || magenta(statusUpper)

        grid.row([
          statusDisplay,
          `${name}${light(':')} ${gray(current)}`,
          latest ? `${cyan(current)} ${light('→')} ${green(latest)}` : gray('—')
        ])
      }

      if (!cliArguments.silent && !cliArguments.json && grid.rows.length > 0) {
        grid.render()
      }

      exitCodes.push(Number(exitCode))
      break // Only process first found compose file
    } catch (error) {
      // Compose file doesn't exist or can't be read, try next
      continue
    }
  }
} catch (error) {
  // Docker ecosystem not available or error, skip silently
}

if (cliArguments.json) process.stdout.write(JSON.stringify(json))

if (!cliArguments.silent) console.timeEnd('completed in')

/* eslint n/no-process-exit: off */
process.exit(Math.max(...exitCodes))
