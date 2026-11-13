import { useEffect, useRef, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTheme } from '@/features/theme/ThemeContext'
import { cn } from '@/lib/utils'
import { useBackToClose } from '@/hooks/useBackToClose'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useVisualViewport } from '@/hooks/useVisualViewport'

/** Chừa một dải trên đầu sheet khi bàn phím iOS ăn gần hết màn hình. */
const TOP_GAP_PX = 12

/**
 * Hộp thoại dạng "bottom sheet" trên điện thoại, hộp giữa màn hình trên desktop
 * — cùng một kiểu khung mà các hộp thoại của module chi tiêu đang lặp lại.
 *
 * Khung cố định: tiêu đề ở trên, **thân cuộn** ở giữa (`overscroll-contain`, để
 * kéo quá đầu/cuối không kéo theo cả trang trên iOS). Thanh nút dính đáy của
 * form (`data-sheet-footer`) tự chịu phần safe-area, nên thân cuộn không có
 * padding đáy bên dưới nó và nội dung không còn lộ ra dưới nút Lưu.
 *
 * Trên điện thoại, sheet bám theo `visualViewport`: iOS không co layout khi
 * bàn phím mở, nên sheet tự nhấc đáy lên trên bàn phím và tự thấp lại.
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
  useBackToClose(open, () => onOpenChange(false))
  const isPhone = useMediaQuery('(max-width: 639px)')
  const vv = useVisualViewport(open && isPhone)
  const bodyRef = useRef<HTMLDivElement>(null)
  const followViewport = open && isPhone

  // Bàn phím vừa mở/đổi cỡ làm thân cuộn thấp lại: kéo ô đang gõ vào chỗ thấy
  // được (`scroll-padding-bottom` của thân cuộn chừa chỗ cho thanh nút).
  useEffect(() => {
    if (!followViewport) return
    const active = document.activeElement
    if (active instanceof HTMLElement && bodyRef.current?.contains(active)) {
      active.scrollIntoView({ block: 'nearest' })
    }
  }, [followViewport, vv.height, vv.keyboardInset])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex max-h-[88dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-t-[26px] rounded-b-none border-[1.5px] p-0 max-sm:pb-0 sm:w-[calc(100%-2rem)] sm:max-w-[460px] sm:rounded-[26px]',
          className,
        )}
        style={{
          background: theme.modalBg,
          borderColor: theme.border,
          color: theme.text,
          ...(followViewport && {
            maxHeight: `min(88dvh, ${Math.max(0, Math.round(vv.height - TOP_GAP_PX))}px)`,
            bottom: vv.keyboardInset,
          }),
        }}
      >
        <DialogTitle
          className="flex-shrink-0 px-5 pt-5 pb-4 font-heading text-xl font-extrabold sm:px-6 sm:pt-6"
          style={{ color: theme.text }}
        >
          {title}
        </DialogTitle>
        <div
          ref={bodyRef}
          className="sheet-body flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 sm:px-6"
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
