function bool (flag) {
  return process.argv.includes(`--${flag}`)
}

function list (flag, defaultValue) {
  const arg = process.argv.find(arg => arg.match(`--${flag}=`))

  // extract value or return default
  const list = arg ? arg.split('=').pop() : defaultValue

  return typeof list === 'string' ? list.split(',').map(String.trim) : list
}

// temporary until rewrite
process.args = {
  color: bool('color'),
  update: bool('update'),
  json: bool('json'),
  silent: bool('silent'),
  ignore: list('ignore', []),
  types: list('types', ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'])
}

module.exports = process.args
