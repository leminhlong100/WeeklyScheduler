import { describe, expect, it, vi } from 'vitest'
import { HAPTIC_SUCCESS_MS, haptic } from './haptic'

describe('haptic', () => {
  it('rung một lần, thật ngắn', () => {
    const vibrate = vi.fn(() => true)
    haptic({ vibrate })
    expect(vibrate).toHaveBeenCalledTimes(1)
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_SUCCESS_MS)
  })

  it('iOS (không có vibrate) hay không có navigator: không lỗi', () => {
    expect(() => haptic({} as Pick<Navigator, 'vibrate'>)).not.toThrow()
    expect(() => haptic(undefined)).not.toThrow()
  })

  it('trình duyệt ném lỗi khi rung: nuốt lỗi', () => {
    const vibrate = vi.fn(() => {
      throw new Error('blocked')
    })
    expect(() => haptic({ vibrate })).not.toThrow()
  })
})
