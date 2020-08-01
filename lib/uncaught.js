const { red } = require('./colors')

// clean errors
function uncaught (error) {
  switch (error.issue) {
    case 'spawn':
      console.error(red('ERROR'), 'failed to run `npm show`')
      break

    /* istanbul ignore next */
    case 'json':
      console.error(red('ERROR'), 'failed to parse `npm show` output')
      break

    /* istanbul ignore next */
    default:
      console.error(red('ERROR'), error.message || error)
  }

  process.exit(1)
}

// catch exceptions (useful for network and system errors)
process.on('uncaughtException', uncaught)
process.on('unhandledRejection', uncaught)
