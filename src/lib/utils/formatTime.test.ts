import { describe, expect, it } from 'vitest'
import { formatClockTime } from './formatTime'

describe('formatClockTime', () => {
  it('chưa có dữ liệu thì rỗng', () => {
    expect(formatClockTime(0, 'vi')).toBe('')
  })

  it('giờ:phút, đủ hai chữ số', () => {
    const t = new Date(2026, 10, 13, 9, 5).getTime()
    expect(formatClockTime(t, 'vi')).toMatch(/09:05/)
    expect(formatClockTime(t, 'en')).toMatch(/09:05/)
  })
})
