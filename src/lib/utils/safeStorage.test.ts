import { afterEach, describe, expect, it, vi } from 'vitest'
import { storageGet, storageGetJson, storageRemove, storageSet } from './safeStorage'

const throwing = () => {
  throw new DOMException('quota', 'QuotaExceededError')
}

afterEach(() => vi.unstubAllGlobals())

describe('safeStorage', () => {
  it('swallows storage that throws on every call', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: throwing, setItem: throwing, removeItem: throwing },
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(storageGet('k')).toBeNull()
    expect(storageSet('k', 'v')).toBe(false)
    expect(() => storageRemove('k')).not.toThrow()
  })

  it('validates parsed JSON', () => {
    const store: Record<string, string> = { ok: '[1,2]', bad: 'null', broken: '{' }
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store[k] ?? null } })
    const isArr = (v: unknown): v is number[] => Array.isArray(v)
    expect(storageGetJson('ok', isArr, [])).toEqual([1, 2])
    expect(storageGetJson('bad', isArr, [])).toEqual([])
    expect(storageGetJson('broken', isArr, [])).toEqual([])
    expect(storageGetJson('missing', isArr, [9])).toEqual([9])
  })
})
