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
  all: bool('all'),
  json: bool('json'),
  silent: bool('silent'),
  ignore: list('ignore', []),
  scopes: list('scopes', []),
  workspaces: bool('workspaces'),
  types: list('types', ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'])
}

/* istanbul ignore next */
if (args.help) {
  console.log(`
--workspaces | process workspaces
--ignore     | comma-separated packages to be ignored, e.g. '--ignore=tap,eslint'
--types      | comma-separated dependency types to check, e.g. '--types=devDependencies,peerDependencies'
--scopes     | comma-separated list of package @scopes to check
--update     | interactive package selection (use with --all for non-interactive)
--all        | with --update, auto-update all packages without prompts
--json       | output JSON results to 'stdout'
--no-color   | disable color output
--silent     | do not output report on 'stderr'
--help       | display cli help
  `)
  process.exit()
}

export default args
