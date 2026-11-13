import { describe, expect, it } from 'vitest'
import { formatStoredAmount, formatTypingAmount, parseMoneyInput } from './parseMoneyInput'

const ok = (raw: string, currency: 'VND' | 'JPY' | 'USD' = 'VND') => {
  const r = parseMoneyInput(raw, currency)
  return r.ok ? r.value : r.error
}

describe('parseMoneyInput — VND', () => {
  it.each([
    ['30000', 30000],
    ['30.000', 30000], // lỗi gốc: từng bị lưu thành 30
    ['30 000', 30000],
    ['30,000', 30000],
    ['1.250.000', 1250000],
    ['30k', 30000],
    ['30K', 30000],
    ['30 nghìn', 30000],
    ['30 ngàn', 30000],
    ['1,5tr', 1500000],
    ['1.5tr', 1500000],
    ['1,5 triệu', 1500000],
    ['2tr', 2000000],
    ['1.500k', 1500000],
    ['2 tỷ', 2000000000],
    ['30.000đ', 30000],
    ['30.000 ₫', 30000],
    ['30000vnd', 30000],
  ])('%s → %d', (raw, expected) => {
    expect(ok(raw)).toBe(expected)
  })

  it.each([
    ['', 'invalid'],
    ['abc', 'invalid'],
    ['-5', 'invalid'],
    ['0', 'invalid'],
    ['1,2345k', 'whole'],
    ['9999999999999', 'tooLarge'],
  ])('%s → %s', (raw, expected) => {
    expect(ok(raw)).toBe(expected)
  })
})

describe('parseMoneyInput — USD / JPY', () => {
  it.each([
    ['12.50', 12.5],
    ['12,50', 12.5],
    ['12.5', 12.5],
    ['1,234.56', 1234.56],
    ['1.234,56', 1234.56],
    ['1.234', 1234],
    ['$20', 20],
  ])('USD %s → %d', (raw, expected) => {
    expect(ok(raw, 'USD')).toBe(expected)
  })

  it('JPY không có phần lẻ', () => {
    expect(ok('1.200', 'JPY')).toBe(1200)
    expect(ok('1200円', 'JPY')).toBe(1200)
  })

  it('canonical là chuỗi số thô', () => {
    const r = parseMoneyInput('30.000', 'VND')
    expect(r.ok && r.canonical).toBe('30000')
  })
})

describe('formatTypingAmount', () => {
  it('nhóm nghìn theo locale khi đang gõ', () => {
    expect(formatTypingAmount('30000', 'VND', 'vi-VN')).toBe('30.000')
    expect(formatTypingAmount('30000', 'VND', 'en-US')).toBe('30,000')
    expect(formatTypingAmount('30.0000', 'VND', 'vi-VN')).toBe('300.000')
    expect(formatTypingAmount('', 'VND', 'vi-VN')).toBe('')
  })

  it('giữ nguyên khi đang gõ hậu tố chữ', () => {
    expect(formatTypingAmount('30k', 'VND', 'vi-VN')).toBeNull()
  })

  it('USD giữ dấu thập phân theo locale, tối đa 2 số lẻ', () => {
    expect(formatTypingAmount('1234.567', 'USD', 'en-US')).toBe('1,234.56')
    expect(formatTypingAmount('1234,5', 'USD', 'vi-VN')).toBe('1.234,5')
    expect(formatTypingAmount('12.', 'USD', 'en-US')).toBe('12.')
  })

  it('số đã lưu hiện lại có dấu nhóm', () => {
    expect(formatStoredAmount(40000, 'VND', 'vi-VN')).toBe('40.000')
    expect(formatStoredAmount(12.5, 'USD', 'en-US')).toBe('12.5')
  })
})

import { firstAmountIn } from './parseMoneyInput'
describe('firstAmountIn', () => {
  it.each([
    ['ăn sáng 30k với bạn', '30000'],
    ['trưa cà phê 35 nghìn', '35000'],
    ['tiền nhà 4,5tr', '4500000'],
    ['đổ xăng 100.000', '100000'],
    ['không có số', null],
  ])('%s → %s', (text, expected) => {
    expect(firstAmountIn(text, 'VND')).toBe(expected)
  })
})
