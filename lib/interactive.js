import prompts from 'prompts'
import Grid from './grid.js'
import { buildPromptChoices, applyUpdates } from './selection.js'

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

export async function confirmChanges (filepath, changes, ecosystem, dryRun = false) {
  let preview = `\nPreview of changes to ${filepath}:\n\n`

  if (ecosystem === 'npm') {
    for (const change of changes) {
      if (change.action === 'update') {
        preview += `  ${change.type}:\n`
        preview += `    ${change.name}: "${change.current}" → "^${change.latest}"\n`
      } else if (change.action === 'remove') {
        preview += `  ${change.type}:\n`
        preview += `    ${change.name}: "${change.current}" → [REMOVED]\n`
      }
    }
  } else if (ecosystem === 'docker') {
    preview += `  services:\n`
    for (const change of changes) {
      preview += `    ${change.service}:\n`
      preview += `      image: ${change.image}:${change.current} → ${change.image}:${change.latest}\n`
    }
  }

  if (dryRun) return preview

  console.log(preview)

  const response = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { title: 'Confirm and update', value: 'confirm' },
      { title: 'Go back and change selection', value: 'back' },
      { title: 'Cancel (no changes)', value: 'cancel' }
    ]
  })

  if (response.action === undefined) {
    return 'cancel'
  }

  return response.action
}

export async function runInteractiveUpdate (state, allItems, mockResponses = null, dryRun = false) {
  const result = { success: false, updated: [], cancelled: false }

  try {
    let selectedEcosystems = state.ecosystems
    if (state.ecosystems.length > 1) {
      const ecosystemResponse = mockResponses !== null
        ? mockResponses.ecosystemChoice
        : (await selectEcosystem(state)).ecosystem

      if (ecosystemResponse === undefined) {
        result.cancelled = true
        return result
      }

      selectedEcosystems = ecosystemResponse === 'both' ? state.ecosystems : [ecosystemResponse]
    }

    for (const ecosystem of selectedEcosystems) {
      const ecosystemState = state[ecosystem]

      let selectedLocations = ecosystemState.locations
      if (ecosystemState.locations.length > 1) {
        const locationResponse = mockResponses !== null
          ? mockResponses.locationChoice
          : (await selectLocations(ecosystem, ecosystemState.locations, ecosystemState.selections)).locations

        if (locationResponse === undefined) {
          result.cancelled = true
          return result
        }

        selectedLocations = locationResponse.includes('all')
          ? ecosystemState.locations
          : locationResponse
      } else {
        selectedLocations = ecosystemState.locations
      }

      for (const location of selectedLocations) {
        const locationItems = allItems.filter(item => {
          if (ecosystem === 'npm') return item.ecosystem === 'npm' && item.workspace === location
          if (ecosystem === 'docker') return item.ecosystem === 'docker' && item.file === location
        })

        if (!dryRun) {
          const gridTitle = ecosystem === 'npm'
            ? `📦 npm Packages (${location})`
            : `🐳 Docker Images (${location})`

          const grid = new Grid(gridTitle)
          for (const item of locationItems) {
            if (ecosystem === 'npm') {
              grid.row([item.name, item.current, item.latest || 'N/A', item.status.toUpperCase()])
            }
          }
          grid.render()
        }

        const packageResponse = mockResponses !== null
          ? mockResponses.packageChoice
          : (await selectPackages(locationItems, ecosystem)).packages

        if (packageResponse === undefined || packageResponse.length === 0) {
          result.cancelled = true
          return result
        }

        const confirmResponse = mockResponses !== null
          ? mockResponses.confirmAction
          : (await confirmChanges(location, packageResponse, ecosystem))

        if (confirmResponse === 'cancel') {
          result.cancelled = true
          return result
        } else if (confirmResponse === 'back') {
          continue
        }

        if (!dryRun) {
          await applyUpdates(location, packageResponse, ecosystem)
        }

        result.updated.push({ location, ecosystem, changes: packageResponse.length })
      }
    }

    result.success = true
    return result

  } catch (error) {
    result.error = error.message
    return result
  }
}
