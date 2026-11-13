import type { ReactNode } from 'react'
import { CloudOffIcon, RotateCwIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { formatClockTime } from '@/lib/utils/formatTime'

/** Phần của một kết quả TanStack Query mà khối trạng thái cần đọc. */
export interface QueryLike {
  isPending: boolean
  isError: boolean
  isPlaceholderData?: boolean
  dataUpdatedAt: number
  /** Đang tải lại ngầm (đã có dữ liệu). */
  isFetching?: boolean
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
        <CloudOffIcon className="size-6" style={{ color: theme.mutedText }} />
        <div className="font-heading text-[15px] font-extrabold" style={{ color: theme.text }}>
          {t.loadErrorTitle}
        </div>
        <p className="text-[13px] font-semibold" style={{ color: theme.mutedText }}>
          {t.loadErrorHint}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-1 flex min-h-11 items-center gap-1.5 rounded-[12px] px-4 text-[13px] font-extrabold transition-transform active:scale-95"
          style={{ background: theme.accent }}
        >
          <RotateCwIcon className="size-4" />
          {t.retry}
        </button>
      </div>
    )
  }

  const time = formatClockTime(query.dataUpdatedAt, locale)

  return (
    <>
      {!online && query.dataUpdatedAt > 0 && (
        <div
          role="status"
          className="flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[12px] font-bold"
          style={{ background: theme.chip, color: theme.mutedText }}
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

/**
 * "Cập nhật lúc HH:mm · Làm mới" — thay cho kéo-để-tải-lại (PWA iOS không có,
 * và React Query đã tự tải lại khi app quay về). Đủ để biết số đang xem là của
 * lúc nào và tự tải lại khi nghi ngờ.
 *
 * Mất mạng thì ẩn: dải ngoại tuyến của `QueryStatus` đã nói giờ của dữ liệu, và
 * "Làm mới" lúc đó chỉ ra lỗi.
 */
export function DataFreshness({ query }: { query: QueryLike }) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const online = useOnlineStatus()
  if (!online || query.dataUpdatedAt === 0) return null
  const busy = !!query.isFetching
  return (
    <div
      className="-mt-2 flex items-center justify-end gap-1 text-[12px] font-bold"
      style={{ color: theme.mutedText }}
    >
      <span aria-live="polite">
        {t.dataUpdatedAtTime.replace('{time}', formatClockTime(query.dataUpdatedAt, locale))}
      </span>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() => void query.refetch()}
        disabled={busy}
        aria-busy={busy}
        className="flex min-h-11 items-center gap-1 rounded-[10px] px-2 font-extrabold disabled:opacity-60"
        style={{ color: theme.accentText }}
      >
        <RotateCwIcon className={busy ? 'size-3.5 animate-spin' : 'size-3.5'} />
        {t.refreshData}
      </button>
    </div>
  )
}
