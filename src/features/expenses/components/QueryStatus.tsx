import type { ReactNode } from 'react'
import { CloudOffIcon, RotateCwIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Phần của một kết quả TanStack Query mà khối trạng thái cần đọc. */
export interface QueryLike {
  isPending: boolean
  isError: boolean
  isPlaceholderData?: boolean
  dataUpdatedAt: number
  refetch: () => unknown
}

interface QueryStatusProps {
  query: QueryLike
  /** Số hàng giả khi đang tải. */
  skeletonRows?: number
  children: ReactNode
}

/**
 * Đứng giữa một query và phần hiển thị dữ liệu của nó.
 *
 * Trước đây trang đọc `data = []` rồi hiện "Tháng này chưa có khoản chi nào" cả
 * khi đang tải lẫn khi mất mạng — người dùng tưởng dữ liệu đã mất. Giờ:
 * - chưa có dữ liệu và đang tải → hàng giả (skeleton);
 * - lỗi mà không có gì trong cache → khối lỗi + nút Thử lại;
 * - mất mạng nhưng có cache → vẫn hiện dữ liệu, kèm một dải nhỏ nói rõ dữ liệu
 *   là của lúc nào.
 * Đang chuyển tháng (`isPlaceholderData`) thì dữ liệu tháng cũ mờ đi thay vì
 * nháy trống.
 */
export function QueryStatus({ query, skeletonRows = 3, children }: QueryStatusProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const online = useOnlineStatus()

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label={t.loadingLabel}>
        {Array.from({ length: skeletonRows }, (_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-2xl"
            style={{ background: theme.chip, opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    )
  }

  if (query.isError && query.dataUpdatedAt === 0) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-2 rounded-2xl border-[1.5px] px-4 py-6 text-center"
        style={{ borderColor: theme.border, background: theme.chip }}
      >
        <CloudOffIcon className="size-6" style={{ color: theme.muted }} />
        <div className="font-heading text-[15px] font-extrabold" style={{ color: theme.text }}>
          {t.loadErrorTitle}
        </div>
        <p className="text-[13px] font-semibold" style={{ color: theme.muted }}>
          {t.loadErrorHint}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-1 flex min-h-11 items-center gap-1.5 rounded-[12px] px-4 text-[13px] font-extrabold text-white transition-transform active:scale-95"
          style={{ background: theme.accent }}
        >
          <RotateCwIcon className="size-4" />
          {t.retry}
        </button>
      </div>
    )
  }

  const time = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <>
      {!online && query.dataUpdatedAt > 0 && (
        <div
          role="status"
          className="flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[12px] font-bold"
          style={{ background: theme.chip, color: theme.muted }}
        >
          <CloudOffIcon className="size-3.5 flex-shrink-0" />
          {t.offlineNotice.replace('{time}', time)}
        </div>
      )}
      <div
        className="flex flex-col gap-3 transition-opacity"
        style={{ opacity: query.isPlaceholderData ? 0.55 : 1 }}
      >
        {children}
      </div>
    </>
  )
}
