const { magenta, cyan, red, green, reset } = require('./colors')

module.exports = (status, { name, version, oldest, latest }) => {
  let result
  let message

  // construct result object & message
  if (['unsupported', 'not-found'].includes(status)) {
    result = { status, name, version }
    message = ['\t', magenta + name + reset, version]
  } else {
    result = { status, name, version, oldest: oldest.version, latest: latest['dist-tags'].latest }
    message = ['\t', cyan + result.version + reset, '→', green + result.latest + reset, '\t', magenta + name + reset, '@', version]
  }

  if (!!process.args.json) return result // eslint-disable-line no-extra-boolean-cast
  if (!!!process.args.silent) console.error(red + status.toUpperCase(), reset, message.join(' ')) // eslint-disable-line no-extra-boolean-cast

  // unsupported shouldn't count as an failure
  return status !== 'unsupported'
}
