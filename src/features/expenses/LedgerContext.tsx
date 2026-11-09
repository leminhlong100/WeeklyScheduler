import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import type { LedgerSummary } from './api/ledgersApi'
import { useLedgers } from './hooks/useLedgers'

/**
 * Sổ đang mở trên trang chi tiêu.
 *
 * `ledgerId = null` là sổ "Cá nhân" (`expenses.ledger_id IS NULL`). Mọi hook đọc
 * và ghi chi tiêu lấy sổ từ đây, nên các component con (báo cáo, thống kê, form
 * sửa, AI nhập nhanh) không phải truyền sổ qua props.
 */
export interface CurrentLedger {
  ledgerId: string | null
  /** Chủ của sổ — danh mục chi tiêu được đọc theo user này. */
  ownerId: string | undefined
  /** False với sổ người khác mời mình xem: ẩn mọi nút thêm/sửa/xoá. */
  canEdit: boolean
  /** Null với sổ cá nhân. */
  info: LedgerSummary | null
}

interface LedgerContextValue extends CurrentLedger {
  ledgers: LedgerSummary[]
  isLoadingLedgers: boolean
  selectLedger: (ledgerId: string | null) => void
}

const LedgerContext = createContext<LedgerContextValue | null>(null)

/** Nhớ sổ đang mở theo thiết bị, để mở lại app là vào đúng sổ đang dùng. */
export const CURRENT_LEDGER_STORAGE_KEY = 'weekly-scheduler:current-ledger'

function readStoredLedgerId(): string | null {
  try {
    return window.localStorage.getItem(CURRENT_LEDGER_STORAGE_KEY)
  } catch {
    return null
  }
}

export function rememberLedger(ledgerId: string | null) {
  try {
    if (ledgerId) window.localStorage.setItem(CURRENT_LEDGER_STORAGE_KEY, ledgerId)
    else window.localStorage.removeItem(CURRENT_LEDGER_STORAGE_KEY)
  } catch {
    // Chế độ riêng tư / bị chặn storage: vẫn chạy, chỉ không nhớ được.
  }
}

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { data: ledgers = [], isLoading, isSuccess } = useLedgers()
  const [selectedId, setSelectedId] = useState<string | null>(readStoredLedgerId)

  const selectLedger = useCallback((ledgerId: string | null) => {
    setSelectedId(ledgerId)
    rememberLedger(ledgerId)
  }, [])

  const value = useMemo<LedgerContextValue>(() => {
    const info = selectedId ? (ledgers.find((l) => l.id === selectedId) ?? null) : null

    // Đã tải xong danh sách mà không thấy sổ đã nhớ (bị gỡ quyền, sổ bị xoá) thì
    // quay về sổ cá nhân — không bao giờ kẹt ở một sổ không mở được.
    if (selectedId && !info && isSuccess) {
      return {
        ledgerId: null,
        ownerId: user?.id,
        canEdit: true,
        info: null,
        ledgers,
        isLoadingLedgers: isLoading,
        selectLedger,
      }
    }

    return {
      ledgerId: selectedId,
      // Đang tải danh sách: chưa biết chủ sổ, để undefined cho các query chờ.
      ownerId: selectedId ? info?.owner_id : user?.id,
      // Chưa rõ quyền thì coi như chỉ xem, tránh hiện nút ghi rồi bị RLS từ chối.
      canEdit: selectedId ? info?.role === 'owner' : true,
      info,
      ledgers,
      isLoadingLedgers: isLoading,
      selectLedger,
    }
  }, [selectedId, ledgers, isLoading, isSuccess, user?.id, selectLedger])

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

/**
 * Sổ đang mở. Ngoài `LedgerProvider` thì trả về sổ cá nhân, để các hook chi tiêu
 * vẫn dùng được ở chỗ khác mà không cần bọc provider.
 */
export function useCurrentLedger(): CurrentLedger {
  const { user } = useAuth()
  const ctx = useContext(LedgerContext)
  if (ctx) return ctx
  return { ledgerId: null, ownerId: user?.id, canEdit: true, info: null }
}

export function useLedgerSwitcher(): LedgerContextValue {
  const ctx = useContext(LedgerContext)
  if (!ctx) throw new Error('useLedgerSwitcher must be used inside <LedgerProvider>')
  return ctx
}

/** Khoá cache con cho một sổ, dưới tiền tố `['expenses', userId]`. */
export const ledgerCacheKey = (ledgerId: string | null) => ledgerId ?? 'personal'
