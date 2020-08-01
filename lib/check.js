const { debuglog } = require('util')

const npm = require('./npm')

const debug = debuglog('UPDATED')

module.exports = async function check ({ type, name, version }) {
  const versions = {
    type,
    name,
    current: version
  }

  debug('check > %s@%s [%s]', name, version)

  // simple test for urls and github variants
  if (version.includes(':') || version.includes('/')) {
    return Object.assign({ status: 'not-supported' }, versions)
  }

  // get current and latest info
  const data = await npm('show', `${name}@${version}`)

  if (!data) {
    return Object.assign({ status: 'not-found' }, versions)
  }

  // NOTE: data will be an array when using a range for version

  debug('found > %s%s found %d results', name, version, Array.isArray(data) ? data.length : 1)

  // results are returned in historical order, the last is the one directly matching our query
  const oldest = Array.isArray(data) ? data[0] : data
  const latest = Array.isArray(data) ? data[data.length - 1] : data

  versions.oldest = oldest.version
  versions.latest = latest['dist-tags'].latest

  debug('found > %s@%s { oldest: %s latest: %s}', name, version, versions.latest, versions.latest)

  let status = false

  if (latest.deprecated) {
    status = 'deprecated'
  }

  // really the whole point of this package is here
  if (!status && versions.oldest !== versions.latest) {
    status = 'outdated'
  }

  // only return a result if there's something actionable
  /* istanbul ignore else */
  if (status) {
    debug('result > %s@%s %s', name, version, status)

    return Object.assign({ status }, versions)
  }
}
