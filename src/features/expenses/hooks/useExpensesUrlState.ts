import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { whenHistorySettles } from '@/hooks/useBackToClose'
import { currentMonthKey, type MonthKey } from '../utils/month'

export const EXPENSE_VIEWS = ['overview', 'transactions', 'report', 'more'] as const
export type ExpenseView = (typeof EXPENSE_VIEWS)[number]

const isMonthKey = (v: string | null): v is MonthKey => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
const isView = (v: string | null): v is ExpenseView =>
  !!v && (EXPENSE_VIEWS as readonly string[]).includes(v)

/**
 * Tháng và tab đang xem nằm trên URL (`/expenses?m=2026-10&tab=report`).
 *
 * Trước đây là state cục bộ: tải lại trang là về tháng này + tab đầu, nút Back
 * của điện thoại thoát khỏi trang thay vì quay lại tab trước. Giờ:
 * - đổi tab = một mục lịch sử mới → Back quay về tab trước;
 * - đổi tháng = thay mục hiện tại → bấm ‹ › mười lần không tạo mười mục Back;
 * - giá trị mặc định (tháng này, Tổng quan) không ghi lên URL cho gọn.
 */
export function useExpensesUrlState() {
  const [params, setParams] = useSearchParams()
  const rawMonth = params.get('m')
  const rawView = params.get('tab')
  const month: MonthKey = isMonthKey(rawMonth) ? rawMonth : currentMonthKey()
  const view: ExpenseView = isView(rawView) ? rawView : 'overview'

  const setMonth = useCallback(
    (next: MonthKey | ((prev: MonthKey) => MonthKey)) => {
      whenHistorySettles(() =>
        setParams(
          (prev) => {
            const p = new URLSearchParams(prev)
            const prevMonth = isMonthKey(p.get('m')) ? (p.get('m') as MonthKey) : currentMonthKey()
            const value = typeof next === 'function' ? next(prevMonth) : next
            if (value === currentMonthKey()) p.delete('m')
            else p.set('m', value)
            return p
          },
          { replace: true },
        ),
      )
    },
    [setParams],
  )

  const setView = useCallback(
    (next: ExpenseView) => {
      whenHistorySettles(() =>
        setParams((prev) => {
          const p = new URLSearchParams(prev)
          if (next === 'overview') p.delete('tab')
          else p.set('tab', next)
          return p
        }),
      )
    },
    [setParams],
  )

  /**
   * `?add=1` — lối tắt "Thêm giao dịch" ở icon app (manifest `shortcuts`). Trang
   * đọc xong thì xoá bằng `replace`, để Back hay tải lại không mở lại form.
   */
  const addRequested = params.get('add') === '1'
  const clearAddRequest = useCallback(() => {
    whenHistorySettles(() => {
      // Đọc URL thật lúc chạy, không đọc `params` của lần render cũ: gọi lần hai
      // (StrictMode) sau khi tham số đã xoá sẽ ghi đè mục lịch sử của sheet vừa mở.
      if (!new URLSearchParams(window.location.search).has('add')) return
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.delete('add')
          return p
        },
        { replace: true },
      )
    })
  }, [setParams])

  return { month, view, setMonth, setView, addRequested, clearAddRequest }
}
