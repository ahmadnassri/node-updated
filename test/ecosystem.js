import { describe, test, expect } from 'bun:test'
import Ecosystem from '../lib/ecosystem.js'

describe('Ecosystem Base Class', () => {
  test('should throw on unimplemented name getter', () => {
    expect(() => Ecosystem.name).toThrow(/Must implement/)
  })

  test('should throw on unimplemented manifestFiles getter', () => {
    expect(() => Ecosystem.manifestFiles).toThrow(/Must implement/)
  })

  test('should throw on unimplemented parse method', async () => {
    const ecosystem = new Ecosystem()
    await expect(ecosystem.parse({})).rejects.toThrow(/Must implement/)
  })

  test('should throw on unimplemented check method', async () => {
    const ecosystem = new Ecosystem()
    await expect(ecosystem.check({})).rejects.toThrow(/Must implement/)
  })

  test('should throw on unimplemented update method', async () => {
    const ecosystem = new Ecosystem()
    await expect(ecosystem.update([])).rejects.toThrow(/Must implement/)
  })
})
