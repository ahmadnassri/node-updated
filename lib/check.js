const { debuglog } = require('util')

const npm = require('./npm')
const log = require('./log')

const debug = debuglog('UPDATED')

module.exports = async function check ({ pkg, type, name, version }) {
  debug('check > %s@%s [%s]', name, version, type)

  // simple test for urls and github variants
  if (version.includes(':') || version.includes('/')) {
    return log('unsupported', { name, version })
  }

  // get current and latest info
  let data = await npm('show', `${name}@${version}`)

  if (!data) {
    return log('not-found', { name, version })
  }

  debug('found > %s%s found %d results', name, version, Array.isArray(data) ? data.length : 1)

  // results are returned in historical order, the last is the one directly matching our query
  const oldest = Array.isArray(data) ? data[0] : data
  const latest = Array.isArray(data) ? data[data.length - 1] : data

  debug('found > %s@%s { oldest: %s latest: %s}', name, version, oldest.version, latest['dist-tags'].latest)

  let status = false

  if (latest.deprecated) {
    status = 'deprecated'
  }

  if (!status && oldest.version !== latest['dist-tags'].latest) {
    if (process.args.update) {
      pkg[type][name] = `^${latest['dist-tags'].latest}`
      status = 'updated'
    } else {
      status = 'outdated'
    }
  }

  if (status) {
    debug('result > %s@%s %s', name, version, status)

    return log(status, { name, version, oldest, latest })
  }
}
