import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useBackToClose } from '@/hooks/useBackToClose'

export interface ConfirmOptions {
  message: string
  /** Chữ trên nút đồng ý; mặc định "Xoá". */
  confirmLabel?: string
  /** Hành động phá huỷ (xoá, rời sổ…): nút đồng ý màu đỏ. Mặc định true. */
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

/**
 * Hộp xác nhận theo theme, thay cho `window.confirm`.
 *
 * `window.confirm` trên PWA iOS hiện tên miền ở đầu hộp, không theo theme, và
 * chặn cả luồng JS. Hộp này chỉ dùng cho việc KHÔNG hoàn tác được (xoá sổ, xoá
 * các lần lặp, gỡ thành viên…); việc hoàn tác được thì làm ngay + toast có nút
 * "Hoàn tác" thay vì hỏi lại.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialogView pending={pending} onClose={close} />
    </ConfirmContext.Provider>
  )
}

function ConfirmDialogView({
  pending,
  onClose,
}: {
  pending: Pending | null
  onClose: (ok: boolean) => void
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const danger = pending?.danger ?? true
  // Hộp này hay mở chồng lên một sheet: Back chỉ đóng hộp (= Huỷ), sheet còn nguyên.
  useBackToClose(pending !== null, () => onClose(false))
  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent
        showCloseButton={false}
        // z-[90]: phải nằm TRÊN Theme Studio (z-80), nếu không hộp "bỏ thay đổi?"
        // bị panel che và không bấm được. Luôn căn giữa, kể cả điện thoại (mặc định
        // của Dialog là bottom sheet bám trái dưới).
        overlayClassName="z-[90]"
        className="z-[90] w-[calc(100%-2rem)] max-w-[400px] rounded-[22px] border-[1.5px] p-5 max-sm:top-1/2 max-sm:bottom-auto max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:-translate-y-1/2 max-sm:pb-5 max-sm:rounded-[22px]"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle className="font-heading text-lg font-extrabold" style={{ color: theme.text }}>
          {t.confirmTitle}
        </DialogTitle>
        <DialogDescription className="text-[14px] font-semibold" style={{ color: theme.mutedText }}>
          {pending?.message}
        </DialogDescription>
        <div className="mt-2 flex justify-end gap-2">
          <Button
            type="button"
            size="touch"
            variant="outline"
            onClick={() => onClose(false)}
            style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            size="touch"
            autoFocus
            onClick={() => onClose(true)}
            className="font-extrabold"
            style={{
              background: danger ? theme.danger : theme.accentFill,
              color: danger ? theme.onDanger : theme.onAccent,
              border: 'none',
            }}
          >
            {pending?.confirmLabel ?? t.delete}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}
