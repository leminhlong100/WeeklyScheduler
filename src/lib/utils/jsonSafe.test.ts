import { describe, expect, it } from 'vitest'
import { isJsonSafe } from './jsonSafe'
import { pendingCountFor } from '@/features/expenses/utils/deposits'

describe('isJsonSafe', () => {
  it('accepts plain JSON data', () => {
    expect(isJsonSafe(null)).toBe(true)
    expect(isJsonSafe([{ id: 'a', amount: 1.5, note: '', paid: false, x: null }])).toBe(true)
    expect(isJsonSafe({ l1: 2, nested: { a: [1, 'b'] }, gone: undefined })).toBe(true)
    expect(isJsonSafe(Object.create(null))).toBe(true)
  })

  it('rejects values JSON silently changes', () => {
    expect(isJsonSafe(new Map([['a', 1]]))).toBe(false)
    expect(isJsonSafe(new Set([1]))).toBe(false)
    expect(isJsonSafe(new Date())).toBe(false)
    expect(isJsonSafe({ counts: new Map() })).toBe(false)
    expect(isJsonSafe([1, NaN])).toBe(false)
    expect(isJsonSafe(Infinity)).toBe(false)
    expect(isJsonSafe(undefined)).toBe(false)
    expect(isJsonSafe({ f: () => 1 })).toBe(false)
    class Row {
      id = 'a'
    }
    expect(isJsonSafe([new Row()])).toBe(false)
  })
})

describe('pendingCountFor', () => {
  it('reads plain records', () => {
    expect(pendingCountFor({ l1: 3 }, 'l1')).toBe(3)
    expect(pendingCountFor({ l1: 3 }, 'l2')).toBe(0)
  })

  it('never throws on old or odd cache shapes', () => {
    // A Map persisted through JSON comes back as {}.
    expect(pendingCountFor(JSON.parse(JSON.stringify(new Map([['l1', 3]]))), 'l1')).toBe(0)
    expect(pendingCountFor(undefined, 'l1')).toBe(0)
    expect(pendingCountFor(null, 'l1')).toBe(0)
    expect(pendingCountFor([], 'l1')).toBe(0)
    expect(pendingCountFor({ l1: '2' }, 'l1')).toBe(0)
    expect(pendingCountFor({ l1: -1 }, 'l1')).toBe(0)
  })
})
