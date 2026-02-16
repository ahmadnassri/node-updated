import { describe, test, expect } from 'bun:test'
import { buildSelectionState } from '../lib/selection.js'

describe('buildSelectionState', () => {
  test('groups npm packages by workspace', () => {
    const packages = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated', current: '^7.3.7', latest: '7.6.0', type: 'dependencies' },
      { ecosystem: 'npm', workspace: 'packages/foo', name: 'react', status: 'outdated', current: '^18.0.0', latest: '18.3.0', type: 'dependencies' }
    ]

    const state = buildSelectionState(packages)

    expect(state.npm.locations).toEqual(['root', 'packages/foo'])
    expect(state.npm.selections.root).toHaveLength(1)
    expect(state.npm.selections['packages/foo']).toHaveLength(1)
  })

  test('groups docker images by compose file', () => {
    const images = [
      { ecosystem: 'docker', file: 'compose.yml', service: 'app', image: 'node', current: '20', latest: '22', status: 'outdated' },
      { ecosystem: 'docker', file: 'services/api/compose.yml', service: 'api', image: 'nginx', current: '1.24', latest: '1.25', status: 'outdated' }
    ]

    const state = buildSelectionState(images)

    expect(state.docker.locations).toEqual(['compose.yml', 'services/api/compose.yml'])
    expect(state.docker.selections['compose.yml']).toHaveLength(1)
  })

  test('separates ecosystems correctly', () => {
    const items = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated' },
      { ecosystem: 'docker', file: 'compose.yml', service: 'app', status: 'outdated' }
    ]

    const state = buildSelectionState(items)

    expect(state.ecosystems).toEqual(['npm', 'docker'])
  })

  test('filters out non-updateable items from selections', () => {
    const packages = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated', current: '^7.3.7', latest: '7.6.0', type: 'dependencies' },
      { ecosystem: 'npm', workspace: 'root', name: 'prompts', status: 'updated', current: '^2.4.2', latest: '2.4.2', type: 'dependencies' }
    ]

    const state = buildSelectionState(packages)

    // Only outdated should be in selections
    expect(state.npm.selections.root).toHaveLength(1)
    expect(state.npm.selections.root[0].name).toBe('semver')
  })
})
