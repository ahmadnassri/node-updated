#!/usr/bin/env node

// process cli args
const args = require('./lib/args')

// load exception handlers
require('./lib/uncaught')

// modules
const { join } = require('path')
const { promises: { writeFile } } = require('fs')

const check = require('./lib/check')
const parse = require('./lib/parse')
const Grid = require('./lib/grid')
const { magenta, cyan, red, green, gray, light } = require('./lib/colors')

// construct full path to package.json
const filename = join(process.cwd(), 'package.json')

// read package.json
const pkg = require(filename)

// process package.json
const dependencies = parse(pkg, args)

async function main () {
  console.time('completed in')

  let fail = false
  let updated = false

  const json = []
  const grid = new Grid()

  for (const dependency of dependencies) {
    // check dependency
    const result = await check(dependency)

    // exit early
    if (!result) continue

    // store for later
    json.push(result)

    // destruct to write output grid
    let { status, name, type, current, latest } = result

    // send non-zero signal?
    if (status !== 'not-supported') fail = true

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

  if (args.json) process.stdout.write(JSON.stringify(json))
  if (!args.silent && !args.json) grid.render()
  if (!args.silent) console.timeEnd('completed in')

  if (args.update) {
    // empty line
    console.error()

    // don't fail!
    fail = false

    if (updated) {
      await writeFile(filename, JSON.stringify(pkg, null, 2) + '\n')

      console.error(gray('package.json updated'), red('you should run'), 'npm install', red('to refresh your package-lock.json file'))
    } else {
      console.error(gray('nothing to update'))
    }
  }

  process.exit(fail)
}

// awaiting top-level await!
main()
