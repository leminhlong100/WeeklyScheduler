import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { whenHistorySettles } from '@/hooks/useBackToClose'
import type { CustomThemeRecord } from '../recipe/types'
import { ThemeStudioPanel } from '../studio/ThemeStudioPanel'
import type { ThemeKey } from '../types'
import { ThemePickerModal } from './ThemePickerModal'

/** What the studio opens on: a saved theme to edit, or a new one seeded from a preset. */
export type StudioTarget =
  | { record: CustomThemeRecord }
  | { record: null; basePreset?: ThemeKey }

interface ThemeUiValue {
  openThemePicker: () => void
  /** True while the studio dock is open — pages narrow themselves beside it. */
  studioOpen: boolean
}

const ThemeUiContext = createContext<ThemeUiValue | null>(null)

/**
 * Bảng chọn giao diện và Theme Studio, dùng chung cho mọi trang.
 *
 * Trước đây chỉ trang Lịch tuần gắn hai thành phần này, nên trang Chi tiêu không
 * có cách nào đổi giao diện. Đặt ở đây thì trang nào cũng chỉ cần gọi
 * `openThemePicker()`.
 */
export function ThemeUiProvider({ children }: { children: ReactNode }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [studioTarget, setStudioTarget] = useState<StudioTarget | null>(null)

  const openThemePicker = useCallback(() => setPickerOpen(true), [])
  const value = useMemo(
    () => ({ openThemePicker, studioOpen: studioTarget !== null }),
    [openThemePicker, studioTarget],
  )

  return (
    <ThemeUiContext.Provider value={value}>
      {children}
      <ThemePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        // Bảng chọn vừa đóng còn đang gỡ mục lịch sử của nó. Mở Studio ngay thì
        // mục của Studio nằm đè lên, mục cũ thành mồ côi và nuốt mất lần Back đầu.
        onEditTheme={(target) => whenHistorySettles(() => setStudioTarget(target))}
      />
      {/* Mounted conditionally on purpose: unmounting is what clears the live
          preview, so there is no way to leave an unsaved draft applied. */}
      {studioTarget && (
        <ThemeStudioPanel target={studioTarget} onClose={() => setStudioTarget(null)} />
      )}
    </ThemeUiContext.Provider>
  )
}

export function useThemeUi(): ThemeUiValue {
  const ctx = useContext(ThemeUiContext)
  if (!ctx) throw new Error('useThemeUi must be used within a ThemeUiProvider')
  return ctx
}
