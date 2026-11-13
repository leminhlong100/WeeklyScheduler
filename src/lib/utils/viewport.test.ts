import { describe, expect, it } from 'vitest'
import { isKeyboardLikelyOpen, isTextEntry, keyboardInset } from './viewport'

describe('isTextEntry', () => {
  it('ô chữ, ô số, ô tìm, textarea bật bàn phím', () => {
    expect(isTextEntry({ tagName: 'INPUT', type: 'text' })).toBe(true)
    expect(isTextEntry({ tagName: 'input', type: 'search' })).toBe(true)
    expect(isTextEntry({ tagName: 'INPUT', type: 'tel' })).toBe(true)
    expect(isTextEntry({ tagName: 'INPUT' })).toBe(true)
    expect(isTextEntry({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isTextEntry({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('checkbox, radio, ngày, nút, chỉ đọc thì không', () => {
    for (const type of ['checkbox', 'radio', 'date', 'button', 'range']) {
      expect(isTextEntry({ tagName: 'INPUT', type })).toBe(false)
    }
    expect(isTextEntry({ tagName: 'INPUT', type: 'text', readOnly: true })).toBe(false)
    expect(isTextEntry({ tagName: 'BUTTON' })).toBe(false)
    expect(isTextEntry(null)).toBe(false)
  })
})

describe('isKeyboardLikelyOpen', () => {
  it('Android: innerHeight giảm > 150px khi đang gõ', () => {
    expect(isKeyboardLikelyOpen({ textFocused: true, innerHeight: 470, baselineHeight: 812 })).toBe(
      true,
    )
  })

  it('iOS: innerHeight giữ nguyên, visualViewport co lại', () => {
    expect(
      isKeyboardLikelyOpen({
        textFocused: true,
        innerHeight: 812,
        baselineHeight: 812,
        visualViewportHeight: 480,
      }),
    ).toBe(true)
  })

  it('không focus ô gõ thì không tính, dù màn hình nhỏ', () => {
    expect(
      isKeyboardLikelyOpen({ textFocused: false, innerHeight: 470, baselineHeight: 812 }),
    ).toBe(false)
  })

  it('bàn phím vật lý: đang gõ nhưng màn hình không đổi', () => {
    expect(
      isKeyboardLikelyOpen({
        textFocused: true,
        innerHeight: 812,
        baselineHeight: 812,
        visualViewportHeight: 812,
      }),
    ).toBe(false)
    // Thanh địa chỉ thu/giãn vài chục px không phải bàn phím.
    expect(isKeyboardLikelyOpen({ textFocused: true, innerHeight: 760, baselineHeight: 812 })).toBe(
      false,
    )
  })
})

describe('keyboardInset', () => {
  it('iOS: phần đáy bị bàn phím đè', () => {
    expect(keyboardInset(812, 492, 0)).toBe(320)
    // Trang bị cuộn ngầm khi focus: offsetTop ăn bớt phần đè.
    expect(keyboardInset(812, 492, 40)).toBe(280)
  })

  it('Android / không bàn phím: 0, không bao giờ âm', () => {
    expect(keyboardInset(470, 470, 0)).toBe(0)
    expect(keyboardInset(800, 812, 0)).toBe(0)
  })
})
