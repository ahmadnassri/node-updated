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
  color: bool('color'),
  update: bool('update'),
  json: bool('json'),
  silent: bool('silent'),
  ignore: list('ignore', []),
  types: list('types', ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'])
}

/* istanbul ignore next */
if (args.help) {
  console.log(`
--json   | output JSON results to 'stdout'
--silent | do not output report on 'stderr'
--color  | enable pretty colors!
--update | force update 'package.json' to latest versions
--ignore | specify comma-separated packages to be ignored, e.g. '--ignore=tap,eslint'
--types  | specify comma-separated dependency types to be checked, e.g. '--types=devDependencies,peerDependencies'
--help   | display cli help
  `)
  process.exit()
}

module.exports = args
