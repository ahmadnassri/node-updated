const npm = require('./npm')

const { magenta, cyan, red, green, reset } = require('./colors')

function log (error, { name, version, data }) {
  let result
  let message

  // construct result object & message
  if (['unsupported', 'not-found'].includes(error)) {
    result = { error, name, version }
    message = ['\t', magenta + name + reset, version]
  } else {
    result = { error, name, version, match: data.version, latest: data['dist-tags'].latest }
    message = ['\t', cyan + result.version + reset, '→', green + result.latest + reset, '\t', magenta + name + reset, '@', version]
  }

  if (!!process.args.json) return result // eslint-disable-line no-extra-boolean-cast
  if (!!!process.args.silent) console.error(red + error.toUpperCase(), reset, message.join(' ')) // eslint-disable-line no-extra-boolean-cast

  // unsupported shouldn't count as an failure
  return error !== 'unsupported'
}

module.exports = async function check ({ pkg, type, name, version }) {
  // simple test for urls and github variants
  if (version.includes(':') || version.includes('/')) {
    return log('unsupported', { name, version })
  }

  // get current and latest info
  let data = await npm('show', `${name}@${version}`)

  if (!data) {
    return log('not-found', { name, version })
  }

  // just process first result if an array match
  data = Array.isArray(data) ? data.pop() : data

  let status = false

  if (data.deprecated) {
    status = 'deprecated'
  }

  if (!status && data['dist-tags'].latest !== data.version) {
    if (process.args.update) {
      pkg[type][name] = `^${data['dist-tags'].latest}`
      status = 'updated'
    } else {
      status = 'outdated'
    }
  }

  if (status) {
    return log(status, { name, version, data })
  }
}
