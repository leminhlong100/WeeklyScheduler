import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTheme } from '@/features/theme/ThemeContext'
import { cn } from '@/lib/utils'

/**
 * Hộp thoại dạng "bottom sheet" trên điện thoại, hộp giữa màn hình trên desktop
 * — cùng một kiểu khung mà các hộp thoại của module chi tiêu đang lặp lại.
 */
export function SheetDialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  children: ReactNode
  className?: string
}) {
  const { theme } = useTheme()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'max-h-[88dvh] w-full max-w-full overflow-y-auto rounded-t-[26px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[460px] sm:rounded-[26px] sm:p-6',
          className,
        )}
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
          {title}
        </DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}
