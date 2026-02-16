import prompts from 'prompts'
import { buildPromptChoices } from './selection.js'

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

export async function selectLocations (ecosystem, locations, selections, dryRun = false) {
  if (locations.length === 1) {
    return dryRun ? locations[0] : { locations: [locations[0]] }
  }

  const choices = locations.map(location => {
    const outdatedCount = selections[location].length
    return {
      title: `${location} (${outdatedCount} outdated)`,
      value: location
    }
  })

  const allLabel = ecosystem === 'npm' ? 'All workspaces' : 'All compose files'
  choices.push({
    title: allLabel,
    value: 'all'
  })

  if (dryRun) return choices

  const message = ecosystem === 'npm'
    ? 'Select workspace(s) to update: (Press <space> to select, <a> to toggle all)'
    : 'Select compose file(s) to update: (Press <space> to select, <a> to toggle all)'

  return prompts({
    type: 'multiselect',
    name: 'locations',
    message,
    choices,
    instructions: false
  })
}

export async function selectPackages (items, ecosystem, dryRun = false, mockSelection = null) {
  const choices = buildPromptChoices(items, ecosystem)

  if (dryRun && mockSelection !== null) {
    return { packages: mockSelection, cancelled: false }
  }

  if (dryRun) return choices

  const message = 'Select packages to update: (Press <space> to select, <a> to toggle all, <enter> to confirm)'

  const response = await prompts({
    type: 'multiselect',
    name: 'packages',
    message,
    choices,
    instructions: false
  })

  if (response.packages === undefined) {
    return { packages: [], cancelled: true }
  }

  if (response.packages.length === 0) {
    const confirm = await prompts({
      type: 'confirm',
      name: 'exit',
      message: 'No packages selected. Exit without updating?',
      initial: true
    })

    if (confirm.exit === undefined || confirm.exit) {
      return { packages: [], cancelled: true }
    }

    return selectPackages(items, ecosystem, dryRun, mockSelection)
  }

  return { packages: response.packages, cancelled: false }
}

export function confirmChanges (changes, dryRun = false) {
  throw new Error('Not implemented yet')
}
