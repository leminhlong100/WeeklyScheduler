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

import { formatSignedMoney } from './formatMoney'
describe('formatSignedMoney', () => {
  it('một quy tắc dấu', () => {
    expect(formatSignedMoney(40000, 'VND', 'vi', 'expense')).toMatch(/^−40\.000\s₫$/)
    expect(formatSignedMoney(40000, 'VND', 'vi', 'income')).toMatch(/^\+40\.000\s₫$/)
    expect(formatSignedMoney(-5000, 'VND', 'vi', 'auto')).toMatch(/^−5\.000\s₫$/)
    expect(formatSignedMoney(5000, 'VND', 'vi', 'auto')).toMatch(/^5\.000\s₫$/)
  })
})
