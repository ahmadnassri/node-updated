/**
 * Build selection state from dependency/image results
 * Groups items by ecosystem and location (workspace/file)
 * Filters to only include updateable items
 */
export function buildSelectionState (items) {
  const state = {
    ecosystems: [],
    npm: { locations: [], selections: {} },
    docker: { locations: [], selections: {} }
  }

  // Group by ecosystem
  const npmItems = items.filter(item => item.ecosystem === 'npm')
  const dockerItems = items.filter(item => item.ecosystem === 'docker')

  // Track which ecosystems have items
  if (npmItems.length > 0) state.ecosystems.push('npm')
  if (dockerItems.length > 0) state.ecosystems.push('docker')

  // Group npm items by workspace
  if (npmItems.length > 0) {
    const workspaces = [...new Set(npmItems.map(item => item.workspace))]
    state.npm.locations = workspaces

    for (const workspace of workspaces) {
      const workspaceItems = npmItems
        .filter(item => item.workspace === workspace)
        .filter(item => item.status === 'outdated' || item.status === 'deprecated')

      state.npm.selections[workspace] = workspaceItems.map(item => ({
        name: item.name,
        type: item.type,
        current: item.current,
        latest: item.latest,
        action: item.status === 'deprecated' ? 'remove' : 'update'
      }))
    }
  }

  // Group docker items by file
  if (dockerItems.length > 0) {
    const files = [...new Set(dockerItems.map(item => item.file))]
    state.docker.locations = files

    for (const file of files) {
      const fileItems = dockerItems
        .filter(item => item.file === file)
        .filter(item => item.status === 'outdated')

      state.docker.selections[file] = fileItems.map(item => ({
        service: item.service,
        image: item.image,
        current: item.current,
        latest: item.latest,
        action: 'update'
      }))
    }
  }

  return state
}

/**
 * Format items into prompts multiselect choices
 * Creates title, value, selected, and disabled properties
 */
export function buildPromptChoices (items, ecosystem) {
  return items.map(item => {
    if (ecosystem === 'npm') {
      const isUpdateable = item.status === 'outdated' || item.status === 'deprecated'
      const action = item.status === 'deprecated' ? 'remove' : `${item.current} → ${item.latest}`
      const statusLabel = item.status.toUpperCase()

      return {
        title: isUpdateable
          ? `${item.name}: ${action} (${statusLabel})`
          : `${item.name}: already updated (${statusLabel})`,
        value: { name: item.name, type: item.type, current: item.current, latest: item.latest },
        selected: isUpdateable,
        disabled: !isUpdateable
      }
    } else if (ecosystem === 'docker') {
      const isUpdateable = item.status === 'outdated'
      const statusLabel = item.status.toUpperCase()

      return {
        title: isUpdateable
          ? `${item.service} (${item.image}): ${item.current} → ${item.latest} (${statusLabel})`
          : `${item.service} (${item.image}): already updated (${statusLabel})`,
        value: { service: item.service, image: item.image, current: item.current, latest: item.latest },
        selected: isUpdateable,
        disabled: !isUpdateable
      }
    }
  })
}
