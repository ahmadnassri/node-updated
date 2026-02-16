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
