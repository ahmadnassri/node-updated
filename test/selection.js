import { describe, test, expect } from 'bun:test'
import { buildSelectionState, buildPromptChoices } from '../lib/selection.js'

describe('buildPromptChoices', () => {
  test('formats npm packages for prompts multiselect', () => {
    const packages = [
      { name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '7.6.0', status: 'outdated' },
      { name: 'prompts', type: 'dependencies', current: '^2.4.2', latest: '2.4.2', status: 'updated' },
      { name: 'request', type: 'dependencies', current: '^2.88', latest: null, status: 'deprecated' }
    ]

    const choices = buildPromptChoices(packages, 'npm')

    expect(choices).toHaveLength(3)

    // Outdated package
    expect(choices[0].title).toBe('semver: ^7.3.7 → 7.6.0 (OUTDATED)')
    expect(choices[0].value).toEqual({ name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '7.6.0' })
    expect(choices[0].selected).toBe(true)
    expect(choices[0].disabled).toBe(false)

    // Updated package (disabled)
    expect(choices[1].title).toContain('already updated')
    expect(choices[1].disabled).toBe(true)
    expect(choices[1].selected).toBe(false)

    // Deprecated package
    expect(choices[2].title).toContain('remove')
    expect(choices[2].selected).toBe(true)
  })

  test('formats docker images for prompts multiselect', () => {
    const images = [
      { service: 'app', image: 'node', current: '20', latest: '22', status: 'outdated' },
      { service: 'db', image: 'postgres', current: '15', latest: '15', status: 'updated' }
    ]

    const choices = buildPromptChoices(images, 'docker')

    expect(choices[0].title).toBe('app (node): 20 → 22 (OUTDATED)')
    expect(choices[0].value).toEqual({ service: 'app', image: 'node', current: '20', latest: '22' })
  })
})

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
