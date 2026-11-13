import { describe, expect, it } from 'vitest'
import { orderByUsage } from './addPreferences'

describe('orderByUsage', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  it('dùng nhiều lên đầu, chưa dùng giữ thứ tự gốc', () => {
    expect(orderByUsage(items, ['c', 'b', 'c']).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd'])
  })
  it('hoà thì gần đây hơn trước', () => {
    expect(orderByUsage(items, ['d', 'b']).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c'])
  })
  it('không có lịch sử → giữ nguyên', () => {
    expect(orderByUsage(items).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})
