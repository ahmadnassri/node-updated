const npm = require('./npm')

function log (error, { name, version, data }) {
  let result
  let message

  // construct result object & message
  if (error === 'unsupported') {
    result = { error, name, version }
    message = `[${name}] ${version}`
  } else {
    result = { error, name, version, match: data.version, latest: data['dist-tags'].latest }
    message = `[${name}@${version}]: match: ${result.version} • latest: ${result.latest}`
  }

  if (!!process.env.UPDATED_JSON) return result // eslint-disable-line no-extra-boolean-cast
  if (!!!process.env.UPDATED_SILENT) console.error(`${error.toUpperCase()}\t`, message) // eslint-disable-line no-extra-boolean-cast

  // unsupported shouldn't count as an failure
  return error !== 'unsupported'
}

module.exports = async function check ({ name, version }) {
  // simple test for urls and github variants
  if (version.includes(':') || version.includes('/')) {
    return log('unsupported', { name, version })
  }

  // get current and latest info
  let data = await npm('show', `${name}@${version}`)

  // just process first result if an array match
  data = Array.isArray(data) ? data.pop() : data

  let error = false

  if (data.deprecated) {
    error = 'deprecated'
  }

  if (!error && data['dist-tags'].latest !== data.version) {
    error = 'outdated'
  }

  if (error) {
    return log(error, { name, version, data })
  }
}
