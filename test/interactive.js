import { describe, test, expect } from 'bun:test'
import { selectEcosystem, selectLocations, selectPackages, confirmChanges } from '../lib/interactive.js'

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
