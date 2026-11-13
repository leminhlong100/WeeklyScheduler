import { describe, expect, it } from 'vitest'
import { isLayerPopped, layerDepthOf, layerIdOf, layerState, withoutLayer } from './historyLayer'

const routerState = { usr: null, key: 'abc', idx: 3 }

describe('historyLayer', () => {
  it('giữ nguyên khoá của React Router khi thêm lớp', () => {
    const s = layerState(routerState, 'layer-1')
    expect(s).toMatchObject(routerState)
    expect(layerIdOf(s)).toBe('layer-1')
    expect(layerDepthOf(s)).toBe(1)
  })

  it('lớp lồng (hộp xác nhận trên sheet) sâu hơn một bậc', () => {
    const sheet = layerState(routerState, 'a')
    const confirm = layerState(sheet, 'b')
    expect(layerDepthOf(confirm)).toBe(2)
    expect(layerIdOf(confirm)).toBe('b')
  })

  it('state rỗng / lạ là mục thường', () => {
    expect(layerDepthOf(null)).toBe(0)
    expect(layerDepthOf(undefined)).toBe(0)
    expect(layerDepthOf({ __layerDepth: 'x' })).toBe(0)
    expect(layerIdOf(routerState)).toBeUndefined()
    expect(layerState(null, 'x')).toEqual({ __layer: 'x', __layerDepth: 1 })
  })

  it('Back đóng đúng lớp trên cùng', () => {
    const sheet = layerState(routerState, 'a')
    // Back từ hộp xác nhận về sheet: sheet (độ sâu 1) còn mở, hộp (2) đóng.
    expect(isLayerPopped(1, sheet)).toBe(false)
    expect(isLayerPopped(2, sheet)).toBe(true)
    // Back từ sheet về trang: sheet đóng.
    expect(isLayerPopped(1, routerState)).toBe(true)
  })

  it('gỡ dấu lớp, giữ phần còn lại', () => {
    expect(withoutLayer(layerState(routerState, 'a'))).toEqual(routerState)
    expect(withoutLayer(null)).toEqual({})
  })
})
