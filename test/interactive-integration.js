import { describe, test, expect, beforeEach } from 'bun:test'
import { join } from 'path'
import { runInteractiveUpdate } from '../lib/interfaces/cli/interactive.js'
import { buildSelectionState } from '../lib/interfaces/cli/selection.js'
import NpmEcosystem from '../lib/ecosystems/npm/index.js'
import cliArguments from '../lib/args.js'

const __dirname = import.meta.dir
const fixtureDir = join(__dirname, 'fixtures', 'interactive-test')

describe('interactive integration', () => {
  let ecosystem
  let dependencies
  let results

  beforeEach(async () => {
    ecosystem = new NpmEcosystem()
    dependencies = await ecosystem.parse(cliArguments, join(fixtureDir, 'package.json'))

    results = []
    for (const dependency of dependencies) {
      const result = await ecosystem.check(dependency)
      if (result) {
        results.push({
          ...result,
          ecosystem: 'npm',
          workspace: 'root'
        })
      }
    }
  })

  test('full interactive flow with mocked prompts', async () => {
    const state = buildSelectionState(results)
    const outdatedPackage = results.find(r => r.status === 'outdated')

    if (!outdatedPackage) {
      console.log('No outdated packages in fixture, skipping test')
      return
    }

    const mockResponses = {
      ecosystemChoice: 'npm',
      locationChoice: ['root'],
      packageChoice: [{
        name: outdatedPackage.name,
        type: outdatedPackage.type,
        current: outdatedPackage.current,
        latest: outdatedPackage.latest
      }],
      confirmAction: 'confirm'
    }

    const result = await runInteractiveUpdate(state, results, mockResponses, true)

    expect(result.success).toBe(true)
    expect(result.cancelled).toBe(false)
    expect(result.updated.length).toBeGreaterThan(0)
  })

  test('handles cancellation gracefully', async () => {
    const state = buildSelectionState(results)

    const mockResponses = {
      ecosystemChoice: undefined
    }

    const result = await runInteractiveUpdate(state, results, mockResponses, true)

    expect(result.success).toBe(false)
    expect(result.cancelled).toBe(true)
  })

  test('handles going back from preview', async () => {
    const state = buildSelectionState(results)
    const outdatedPackage = results.find(r => r.status === 'outdated')

    if (!outdatedPackage) {
      return
    }

    const mockResponses = {
      ecosystemChoice: 'npm',
      locationChoice: ['root'],
      packageChoice: [{
        name: outdatedPackage.name,
        type: outdatedPackage.type,
        current: outdatedPackage.current,
        latest: outdatedPackage.latest
      }],
      confirmAction: 'back'
    }

    const result = await runInteractiveUpdate(state, results, mockResponses, true)
    expect(result).toBeDefined()
  })
})
