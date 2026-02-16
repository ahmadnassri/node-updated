import { describe, test, expect } from 'bun:test'
import { selectEcosystem, selectLocations, selectPackages, confirmChanges, runInteractiveUpdate } from '../lib/interfaces/cli/interactive.js'
import { buildPromptChoices, buildSelectionState } from '../lib/interfaces/cli/selection.js'

describe('interactive prompts', () => {
  test('selectEcosystem formats ecosystem choices correctly', () => {
    const state = {
      ecosystems: ['npm', 'docker'],
      npm: { locations: ['root', 'packages/foo'], selections: { root: [1, 2], 'packages/foo': [3] } },
      docker: { locations: ['compose.yml'], selections: { 'compose.yml': [1] } }
    }

    const choices = selectEcosystem(state, true) // true = dry run for testing

    expect(choices).toHaveLength(3)
    expect(choices[0].title).toContain('npm packages')
    expect(choices[0].title).toContain('3 outdated')
    expect(choices[0].title).toContain('2 workspaces')
    expect(choices[1].title).toContain('Docker images')
    expect(choices[2].title).toBe('Both')
  })
})

describe('selectLocations', () => {
  test('formats workspace choices with outdated counts', async () => {
    const locations = ['root', 'packages/foo', 'packages/bar']
    const selections = {
      root: [1, 2],
      'packages/foo': [1, 2, 3],
      'packages/bar': [1]
    }

    const choices = await selectLocations('npm', locations, selections, true)

    expect(choices).toHaveLength(4) // 3 workspaces + "All workspaces"
    expect(choices[0].title).toContain('root (2 outdated)')
    expect(choices[1].title).toContain('packages/foo (3 outdated)')
    expect(choices[2].title).toContain('packages/bar (1 outdated)')
    expect(choices[3].title).toBe('All workspaces')
    expect(choices[3].value).toBe('all')
  })

  test('formats compose file choices with outdated counts', async () => {
    const locations = ['compose.yml', 'services/api/compose.yml']
    const selections = {
      'compose.yml': [1],
      'services/api/compose.yml': [1, 2]
    }

    const choices = await selectLocations('docker', locations, selections, true)

    expect(choices).toHaveLength(3) // 2 files + "All compose files"
    expect(choices[0].title).toContain('compose.yml (1 outdated)')
    expect(choices[1].title).toContain('services/api/compose.yml (2 outdated)')
    expect(choices[2].title).toBe('All compose files')
  })

  test('returns single location directly when only one exists', async () => {
    const locations = ['root']
    const selections = { root: [1, 2] }

    const result = await selectLocations('npm', locations, selections, true)

    expect(result).toBe('root')
  })
})

describe('selectPackages', () => {
  test('uses buildPromptChoices to format package list', async () => {
    const items = [
      { name: 'semver', current: '^7.3.7', latest: '7.6.0', status: 'outdated', type: 'dependencies' },
      { name: 'prompts', current: '^2.4.2', latest: '2.4.2', status: 'updated', type: 'dependencies' }
    ]

    const choices = await selectPackages(items, 'npm', true)

    expect(choices).toHaveLength(2)
    expect(choices[0].title).toContain('semver')
    expect(choices[0].selected).toBe(true)
    expect(choices[1].disabled).toBe(true)
  })

  test('handles empty selection gracefully', async () => {
    const items = [
      { name: 'semver', current: '^7.3.7', latest: '7.6.0', status: 'outdated', type: 'dependencies' }
    ]

    const result = await selectPackages(items, 'npm', true, [])

    expect(result).toEqual({ packages: [], cancelled: false })
  })
})

describe('confirmChanges', () => {
  test('formats npm package changes for preview', async () => {
    const changes = [
      { name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '7.6.0', action: 'update' },
      { name: 'request', type: 'dependencies', current: '^2.88', latest: null, action: 'remove' }
    ]

    const preview = await confirmChanges('package.json', changes, 'npm', true)

    expect(preview).toContain('semver')
    expect(preview).toContain('^7.3.7')
    expect(preview).toContain('7.6.0')
    expect(preview).toContain('request')
    expect(preview).toContain('[REMOVED]')
  })

  test('formats docker image changes for preview', async () => {
    const changes = [
      { service: 'app', image: 'node', current: '20', latest: '22', action: 'update' }
    ]

    const preview = await confirmChanges('compose.yml', changes, 'docker', true)

    expect(preview).toContain('app')
    expect(preview).toContain('node')
    expect(preview).toContain('20')
    expect(preview).toContain('22')
  })
})

describe('runInteractiveUpdate', () => {
  test('orchestrates full interactive flow for single ecosystem', async () => {
    const items = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated', current: '^7.3.7', latest: '7.6.0', type: 'dependencies' }
    ]

    const state = buildSelectionState(items)

    const mockResponses = {
      ecosystemChoice: 'npm',
      locationChoice: ['root'],
      packageChoice: [{ name: 'semver', type: 'dependencies', current: '^7.3.7', latest: '7.6.0' }],
      confirmAction: 'confirm'
    }

    const result = await runInteractiveUpdate(state, items, mockResponses, true)

    expect(result.success).toBe(true)
    expect(result.updated).toHaveLength(1)
    expect(result.updated[0].location).toBe('root')
  })

  test('handles user cancellation at any stage', async () => {
    const items = [
      { ecosystem: 'npm', workspace: 'root', name: 'semver', status: 'outdated', current: '^7.3.7', latest: '7.6.0', type: 'dependencies' }
    ]

    const state = buildSelectionState(items)

    const mockResponses = {
      ecosystemChoice: undefined
    }

    const result = await runInteractiveUpdate(state, items, mockResponses, true)

    expect(result.success).toBe(false)
    expect(result.cancelled).toBe(true)
  })
})
