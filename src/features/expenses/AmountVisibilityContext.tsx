import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Mặc định ẩn — người ngồi cạnh không nên thấy số tiền ngay khi mở app lên. */
const HIDDEN_KEY = 'weeklyScheduler.amountsHidden'

function readStoredHidden(): boolean {
  if (typeof window === 'undefined') return true
  const stored = window.localStorage.getItem(HIDDEN_KEY)
  // Chỉ 'false' tường minh mới coi là đã chọn hiện; mọi giá trị khác (kể cả
  // chưa từng lưu) đều ẩn theo mặc định.
  return stored !== 'false'
}

interface AmountVisibilityContextValue {
  hidden: boolean
  toggleHidden: () => void
}

const AmountVisibilityContext = createContext<AmountVisibilityContextValue | null>(null)

export function AmountVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(readStoredHidden)

  const toggleHidden = useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      window.localStorage.setItem(HIDDEN_KEY, String(next))
      return next
    })
  }, [])

  const value = useMemo(() => ({ hidden, toggleHidden }), [hidden, toggleHidden])

  return (
    <AmountVisibilityContext.Provider value={value}>{children}</AmountVisibilityContext.Provider>
  )
}

export function useAmountVisibility(): AmountVisibilityContextValue {
  const ctx = useContext(AmountVisibilityContext)
  if (!ctx) throw new Error('useAmountVisibility must be used within an AmountVisibilityProvider')
  return ctx
}
