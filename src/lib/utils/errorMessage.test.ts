import { describe, expect, it } from 'vitest'
import { vi as viDict } from '@/features/i18n/locales/vi'
import { describeError, isNetworkError } from './errorMessage'

describe('isNetworkError', () => {
  it('nhận lỗi fetch của Chrome, Firefox, Safari', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'), true)).toBe(true)
    // supabase-js gói lỗi fetch thành message "TypeError: Failed to fetch".
    expect(isNetworkError({ message: 'TypeError: Failed to fetch' }, true)).toBe(true)
    expect(
      isNetworkError({ message: 'NetworkError when attempting to fetch resource.' }, true),
    ).toBe(true)
    expect(isNetworkError({ message: 'Load failed' }, true)).toBe(true)
  })

  it('offline thì luôn là lỗi mạng', () => {
    expect(isNetworkError({ code: '23505', message: 'duplicate' }, false)).toBe(true)
  })

  it('máy chủ từ chối không phải lỗi mạng', () => {
    expect(isNetworkError({ code: '23505', message: 'duplicate key value' }, true)).toBe(false)
    expect(isNetworkError(null, true)).toBe(false)
  })
})

describe('describeError với lỗi mạng', () => {
  it('mặc định là câu mạng chung', () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    expect(describeError(viDict, new TypeError('Failed to fetch'))).toBe(viDict.errNetwork)
  })

  it('màn hình lưu giao dịch nói rõ "chưa được lưu"', () => {
    expect(
      describeError(viDict, new TypeError('Failed to fetch'), {
        network: viDict.errNetworkNotSaved,
      }),
    ).toBe(viDict.errNetworkNotSaved)
    expect(viDict.errNetworkNotSaved).toMatch(/chưa được lưu/)
  })
})
