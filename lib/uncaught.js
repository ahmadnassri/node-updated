import debug from './debug.js'
import { red } from './colors.js'

// clean errors
function uncaught (error) {
  switch (error.issue) {
    case 'spawn':
      console.error(red('ERROR'), `failed to run "npm ${error.args.join(' ')}"`)
      debug('code:', error.code)
      debug('stderr:', error.stderr.toString())
      break

    /* istanbul ignore next */
    case 'json':
      console.error(red('ERROR'), `failed to parse "npm --json ${error.args.join(' ')}" output`)
      break

    /* istanbul ignore next */
    default:
      console.error(red('ERROR'), error)
  }

  process.exit(1)
}

// catch exceptions (useful for network and system errors)
process.on('uncaughtException', uncaught)
process.on('unhandledRejection', uncaught)
