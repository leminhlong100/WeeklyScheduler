import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Mặc định ẩn — người ngồi cạnh không nên thấy số tiền ngay khi mở app lên. */
const HIDDEN_KEY = 'weeklyScheduler.amountsHidden'
/** Các mục được chọn ẩn riêng, chỉ có tác dụng khi nút ẩn tổng đang tắt. */
const SCOPES_KEY = 'weeklyScheduler.amountsHiddenScopes'

/** Những khối tổng có thể ẩn riêng; danh mục dùng khoá `cat:<id>`. */
export type AmountScope = 'month' | 'year' | 'day'

export const categoryScopeKey = (categoryId: string) => `cat:${categoryId}`

function readStoredHidden(): boolean {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(HIDDEN_KEY)
  // Chỉ 'false' tường minh mới coi là đã chọn hiện; mọi giá trị khác (kể cả
  // chưa từng lưu) đều ẩn theo mặc định.
  return stored !== 'false'
}

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
  /** Ẩn tất cả. Bật thì mọi số tiền bị che, bất kể danh sách ẩn riêng. */
  hidden: boolean
  toggleHidden: () => void
  /** Các mục ẩn riêng (khối tổng + danh mục), áp dụng khi `hidden` là false. */
  hiddenScopes: ReadonlySet<string>
  toggleScope: (key: string) => void
  /** Số tiền thuộc `scope` / danh mục `categoryId` có đang bị che không. */
  isMasked: (scope?: AmountScope, categoryId?: string | null) => boolean
}

const AmountVisibilityContext = createContext<AmountVisibilityContextValue | null>(null)

export function AmountVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(readStoredHidden)
  const [hiddenScopes, setHiddenScopes] = useState(readStoredScopes)

  const toggleHidden = useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      window.localStorage.setItem(HIDDEN_KEY, String(next))
      return next
    })
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

  const isMasked = useCallback(
    (scope?: AmountScope, categoryId?: string | null) =>
      hidden ||
      (scope !== undefined && hiddenScopes.has(scope)) ||
      (!!categoryId && hiddenScopes.has(categoryScopeKey(categoryId))),
    [hidden, hiddenScopes],
  )

  const value = useMemo(
    () => ({ hidden, toggleHidden, hiddenScopes, toggleScope, isMasked }),
    [hidden, toggleHidden, hiddenScopes, toggleScope, isMasked],
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
