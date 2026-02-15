import { describe, test } from 'node:test'
import assert from 'node:assert'
import Ecosystem from '../lib/ecosystem.js'

describe('Ecosystem Base Class', () => {
  test('should throw on unimplemented name getter', () => {
    assert.throws(() => Ecosystem.name, /Must implement/)
  })

  test('should throw on unimplemented manifestFiles getter', () => {
    assert.throws(() => Ecosystem.manifestFiles, /Must implement/)
  })

  test('should throw on unimplemented parse method', async () => {
    const ecosystem = new Ecosystem()
    await assert.rejects(
      async () => await ecosystem.parse({}),
      /Must implement/
    )
  })

  test('should throw on unimplemented check method', async () => {
    const ecosystem = new Ecosystem()
    await assert.rejects(
      async () => await ecosystem.check({}),
      /Must implement/
    )
  })

  test('should throw on unimplemented update method', async () => {
    const ecosystem = new Ecosystem()
    await assert.rejects(
      async () => await ecosystem.update([]),
      /Must implement/
    )
  })
})
