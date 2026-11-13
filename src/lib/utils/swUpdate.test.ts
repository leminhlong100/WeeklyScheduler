import { describe, expect, it } from 'vitest'
import { SW_UPDATE_CHECK_INTERVAL_MS, shouldCheckForUpdate } from './swUpdate'

const HOUR = SW_UPDATE_CHECK_INTERVAL_MS

describe('shouldCheckForUpdate', () => {
  it('quay lại sau hơn 1 giờ thì kiểm', () => {
    expect(shouldCheckForUpdate({ now: HOUR + 1, lastCheck: 0, online: true })).toBe(true)
    expect(shouldCheckForUpdate({ now: HOUR, lastCheck: 0, online: true })).toBe(true)
  })

  it('vừa kiểm chưa lâu thì thôi', () => {
    expect(shouldCheckForUpdate({ now: HOUR - 1, lastCheck: 0, online: true })).toBe(false)
  })

  it('offline thì không kiểm', () => {
    expect(shouldCheckForUpdate({ now: 10 * HOUR, lastCheck: 0, online: false })).toBe(false)
  })

  it('đổi được ngưỡng (để thử)', () => {
    expect(
      shouldCheckForUpdate({ now: 61_000, lastCheck: 0, online: true, intervalMs: 60_000 }),
    ).toBe(true)
  })
})
