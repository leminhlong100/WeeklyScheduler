import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Các mục được chọn che. */
const SCOPES_KEY = 'weeklyScheduler.amountsHiddenScopes'

/** Những khối tổng có thể ẩn riêng; danh mục dùng khoá `cat:<id>`. */
export type AmountScope = 'month' | 'year' | 'day'

export const categoryScopeKey = (categoryId: string) => `cat:${categoryId}`

function readStoredScopes(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SCOPES_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

interface AmountVisibilityContextValue {
  /**
   * Có đang che các mục đã chọn không. Nút con mắt chỉ bật/tắt "xem tạm" các mục
   * đó, không phải một nút ẩn tất cả; không lưu, nên mở lại app là che lại ngay.
   */
  hidden: boolean
  toggleHidden: () => void
  /** Các mục luôn bị che (khối tổng + danh mục) trừ lúc đang xem tạm. */
  hiddenScopes: ReadonlySet<string>
  toggleScope: (key: string) => void
  /** Thay cả danh sách mục bị che (chọn tất cả / bỏ chọn tất cả). */
  setScopes: (keys: string[]) => void
  /** Số tiền thuộc `scope` / danh mục `categoryId` có đang bị che không. */
  isMasked: (scope?: AmountScope, categoryId?: string | null) => boolean
}

const AmountVisibilityContext = createContext<AmountVisibilityContextValue | null>(null)

export function AmountVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true)
  const [hiddenScopes, setHiddenScopes] = useState(readStoredScopes)

  const toggleHidden = useCallback(() => {
    setHidden((prev) => !prev)
  }, [])

  const toggleScope = useCallback((key: string) => {
    setHiddenScopes((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      try {
        window.localStorage.setItem(SCOPES_KEY, JSON.stringify([...next]))
      } catch {
        // Không lưu được thì vẫn dùng được trong phiên này.
      }
      return next
    })
  }, [])

  const setScopes = useCallback((keys: string[]) => {
    const next = new Set(keys)
    try {
      window.localStorage.setItem(SCOPES_KEY, JSON.stringify([...next]))
    } catch {
      // Không lưu được thì vẫn dùng được trong phiên này.
    }
    setHiddenScopes(next)
  }, [])

  const isMasked = useCallback(
    (scope?: AmountScope, categoryId?: string | null) =>
      hidden &&
      ((scope !== undefined && hiddenScopes.has(scope)) ||
        (!!categoryId && hiddenScopes.has(categoryScopeKey(categoryId)))),
    [hidden, hiddenScopes],
  )

  const value = useMemo(
    () => ({ hidden, toggleHidden, hiddenScopes, toggleScope, setScopes, isMasked }),
    [hidden, toggleHidden, hiddenScopes, toggleScope, setScopes, isMasked],
  )

  return (
    <AmountVisibilityContext.Provider value={value}>{children}</AmountVisibilityContext.Provider>
  )
}

export function useAmountVisibility(): AmountVisibilityContextValue {
  const ctx = useContext(AmountVisibilityContext)
  if (!ctx) throw new Error('useAmountVisibility must be used within an AmountVisibilityProvider')
  return ctx
}
