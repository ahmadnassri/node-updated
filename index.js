#!/usr/bin/env node

// clean errors
function uncaught (error) {
  switch (error.issue) {
    case 'spawn':
      console.error('ERROR\t failed to run `npm show`')
      break

    /* istanbul ignore next */
    case 'json':
      console.error('ERROR\t failed to parse `npm show` output')
      break

    /* istanbul ignore next */
    default:
      console.error('ERROR\t', error.message || error)
  }

  process.exit(1)
}

// catch exceptions (useful for network and system errors)
process.on('uncaughtException', uncaught)
process.on('unhandledRejection', uncaught)

// load dependencies
const { join } = require('path')
const check = require('./lib/check')

// read package.json
const pkg = require(join(process.cwd(), 'package.json'))

// dependencies collection
const dependencies = []

// types of dependencies
const types = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']

// gather all dependencies
types.forEach(type => {
  if (!pkg[type]) return

  // loop & gather
  Object.entries(pkg[type]).forEach(([name, version]) => dependencies.push({ type, name, version }))
})

// let's do this!
Promise
  .all(dependencies.map(check))
  .then(output => {
    // JSON
    if (process.env.UPDATED_JSON) {
      console.log(JSON.stringify(output))
      process.exit(1)
    }

    // conditional exit code
    process.exit(output.includes(true))
  })
