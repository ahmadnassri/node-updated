function bool (flag) {
  return process.argv.includes(`--${flag}`)
}

function list (flag, defaultValue) {
  const arg = process.argv.find(arg => arg.match(`--${flag}=`))

  // extract value or return default
  const list = arg ? arg.split('=').pop() : defaultValue

  return typeof list === 'string' ? list.split(',') : list
}

// temporary until rewrite
const args = {
  help: bool('help'),
  'no-color': bool('no-color'),
  update: bool('update'),
  json: bool('json'),
  silent: bool('silent'),
  ignore: list('ignore', []),
  scopes: list('scopes', []),
  types: list('types', ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'])
}

/* istanbul ignore next */
if (args.help) {
  console.log(`
--ignore    | comma-separated packages to be ignored, e.g. '--ignore=tap,eslint'
--types     | comma-separated dependency types to check, e.g. '--types=devDependencies,peerDependencies'
--scopes    | comma-separated list of package @scopes to check
--update    | force update 'package.json' to latest versions
--json      | output JSON results to 'stdout'
--no-color  | disable color output
--silent    | do not output report on 'stderr'
--help      | display cli help
  `)
  process.exit()
}

module.exports = args
