import prompts from 'prompts'

export function selectEcosystem (state, dryRun = false) {
  const choices = []

  if (state.ecosystems.includes('npm')) {
    const totalOutdated = Object.values(state.npm.selections).reduce((sum, arr) => sum + arr.length, 0)
    const locationCount = state.npm.locations.length
    const locationLabel = locationCount === 1 ? 'workspace' : 'workspaces'

    choices.push({
      title: `npm packages (${totalOutdated} outdated across ${locationCount} ${locationLabel})`,
      value: 'npm'
    })
  }

  if (state.ecosystems.includes('docker')) {
    const totalOutdated = Object.values(state.docker.selections).reduce((sum, arr) => sum + arr.length, 0)
    const fileCount = state.docker.locations.length
    const fileLabel = fileCount === 1 ? 'compose file' : 'compose files'

    choices.push({
      title: `Docker images (${totalOutdated} outdated in ${fileCount} ${fileLabel})`,
      value: 'docker'
    })
  }

  if (choices.length > 1) {
    choices.push({
      title: 'Both',
      value: 'both'
    })
  }

  if (dryRun) return choices

  return prompts({
    type: 'select',
    name: 'ecosystem',
    message: 'Which ecosystem do you want to update?',
    choices
  })
}

export function selectLocations (ecosystem, locations, selections, dryRun = false) {
  throw new Error('Not implemented yet')
}

export function selectPackages (items, ecosystem, dryRun = false) {
  throw new Error('Not implemented yet')
}

export function confirmChanges (changes, dryRun = false) {
  throw new Error('Not implemented yet')
}
