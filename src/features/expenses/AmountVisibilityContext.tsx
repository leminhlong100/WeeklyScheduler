import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Các mục được chọn che. */
const SCOPES_KEY = 'weeklyScheduler.amountsHiddenScopes'

/** Những khối tổng có thể ẩn riêng; danh mục dùng khoá `cat:<id>`. */
export type AmountScope = 'month' | 'year' | 'day'

/** Khoá cho nhóm "chưa phân loại": khoản không có danh mục cũng phải che được. */
export const UNCATEGORIZED_SCOPE_KEY = 'cat:none'

export const categoryScopeKey = (categoryId: string | null) =>
  categoryId === null ? UNCATEGORIZED_SCOPE_KEY : `cat:${categoryId}`

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
  // "Che theo lựa chọn" — mặc định bật, mở lại app là che lại ngay.
  const [scopedOn, setScopedOn] = useState(true)
  const [hiddenScopes, setHiddenScopes] = useState(readStoredScopes)

  const toggleHidden = useCallback(() => {
    setScopedOn((prev) => !prev)
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

  // `categoryId === null` là khoản chưa phân loại — trước đây nó không bao giờ
  // bị che, kể cả khi đã chọn che mọi danh mục.
  //
  // Chưa chọn mục nào thì mặc định KHÔNG che gì (như trước), và nút con mắt đổi
  // vai thành "che tất cả". Trước đây trường hợp này làm nút con mắt không có tác
  // dụng gì, trông như hỏng.
  const noScopes = hiddenScopes.size === 0
  const hidden = noScopes ? !scopedOn : scopedOn

  const isMasked = useCallback(
    (scope?: AmountScope, categoryId?: string | null) => {
      if (!hidden) return false
      if (noScopes) return true
      if (scope !== undefined && hiddenScopes.has(scope)) return true
      return categoryId !== undefined && hiddenScopes.has(categoryScopeKey(categoryId))
    },
    [hidden, noScopes, hiddenScopes],
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
