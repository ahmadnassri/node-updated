#!/usr/bin/env node

import module from 'node:module'

// process cli args
import args from './lib/args.js'

// load exception handlers
import './lib/uncaught.js'

// modules
import { join } from 'path'
import { writeFile } from 'fs/promises'

import check from './lib/check.js'
import parse from './lib/parse.js'
import Grid from './lib/grid.js'
import { magenta, cyan, red, green, gray, light } from './lib/colors.js'

const require = module.createRequire(import.meta.url)

console.time('completed in')

// construct full path to package.json
const filename = join(process.cwd(), 'package.json')

// check for workspaces in root package.json
const workspaces = require(filename).workspaces || []

async function main (filename, workspace) {
  // read package.json
  const pkg = require(filename)

  // process package.json
  const dependencies = parse(pkg, args)

  let exitCode = false
  let updated = false

  const data = []
  const grid = new Grid()

  for (const dependency of dependencies) {
    // check dependency
    let result = await check(dependency)

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
    if (status === 'outdated' && latest && args.update) {
      // write to package.json data
      pkg[type][name] = `^${latest}`

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

  if (!args.silent && !args.json) grid.render()

  if (args.update) {
    // empty line
    console.error()

    // don't fail!
    exitCode = false

    if (updated) {
      await writeFile(filename, JSON.stringify(pkg, null, 2) + '\n')

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

if (args.workspaces) {
  for (const workspace of ['.', ...workspaces]) {
    if (!args.json) console.log('processing workspace:', workspace === '.' ? 'root' : workspace)

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

if (args.json) process.stdout.write(JSON.stringify(json))

if (!args.silent) console.timeEnd('completed in')

process.exit(Math.max(...exitCodes))
