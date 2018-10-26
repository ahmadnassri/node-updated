const { spawn } = require('child_process')

module.exports = function npm (...args) {
  let stdout = []
  let stderr = []

  // spawn npm
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['--json'].concat(args))

    npm.stdout.on('data', data => stdout.push(data))
    npm.stderr.on('data', data => stderr.push(data))

    npm.on('close', code => {
      stdout = Buffer.concat(stdout)
      stderr = Buffer.concat(stderr)

      // exit with errors
      if (code !== 0) {
        return reject({ issue: 'spawn', code, stderr: stderr.toString() }) // eslint-disable-line prefer-promise-reject-errors
      }

      // no output
      /* istanbul ignore next */
      if (stdout.length === 0) {
        return resolve()
      }

      // process results
      try {
        return resolve(JSON.parse(stdout))
      } catch (error) {
        /* istanbul ignore next */
        return reject({ issue: 'json', content: stdout.toString() }) // eslint-disable-line prefer-promise-reject-errors
      }
    })
  })
}
