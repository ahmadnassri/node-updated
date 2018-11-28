#!/usr/bin/env node

const { writeFileSync } = require('fs')

const getIgnoreList = () => {
  const arg = process.argv.find(arg => arg.match('--ignore='))
  if (!arg) return []
  return arg.split('=').pop()
}

// update flag
process.args = {
  color: process.argv.includes('--color'),
  update: process.argv.includes('--update'),
  json: process.argv.includes('--json'),
  silent: process.argv.includes('--silent'),
  ignore: getIgnoreList()
}

const { red, reset } = require('./lib/colors')

// clean errors
function uncaught (error) {
  switch (error.issue) {
    case 'spawn':
      console.error(red, 'ERROR', reset, 'failed to run `npm show`')
      break

    /* istanbul ignore next */
    case 'json':
      console.error(red, 'ERROR', reset, 'failed to parse `npm show` output')
      break

    /* istanbul ignore next */
    default:
      console.error(red, 'ERROR', reset, error.message || error)
  }

  process.exit(1)
}

// catch exceptions (useful for network and system errors)
process.on('uncaughtException', uncaught)
process.on('unhandledRejection', uncaught)

// load dependencies
const { join } = require('path')
const check = require('./lib/check')

const packageFile = join(process.cwd(), 'package.json')

// read package.json
const pkg = require(packageFile)

// dependencies collection
const dependencies = []

// types of dependencies
const types = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']

// gather all dependencies
types.forEach(type => {
  if (!pkg[type]) return

  // loop & gather
  Object.entries(pkg[type]).forEach(([name, version]) => {
    if (!process.args.ignore.includes(name)) dependencies.push({ pkg, type, name, version })
  })
})

// let's do this!
Promise
  .all(dependencies.map(check))
  .then(output => {
    // JSON
    if (process.args.json) {
      console.log(JSON.stringify(output.filter(Boolean)))
      process.exit(1)
    }

    if (process.args.update) {
      writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + '\n', (err) => {
        if (err) throw err
        console.log('package.json updated')
      })
    }

    // conditional exit code
    process.exit(output.includes(true))
  })
