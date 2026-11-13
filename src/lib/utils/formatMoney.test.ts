import { describe, expect, it } from 'vitest'
import { formatMoney, formatPercent } from './formatMoney'

describe('formatPercent', () => {
  it('theo locale, một số lẻ cho tỉ lệ nhỏ', () => {
    expect(formatPercent(0.004, 'vi')).toBe('0,4%')
    expect(formatPercent(0.004, 'en')).toBe('0.4%')
    expect(formatPercent(0.63, 'vi')).toBe('63%')
  })
})

describe('formatMoney', () => {
  it('VND không số lẻ', () => {
    expect(formatMoney(40000, 'VND', 'vi')).toMatch(/^40\.000\s₫$/)
  })
})
