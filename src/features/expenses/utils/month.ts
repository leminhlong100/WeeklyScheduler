import dayjs from 'dayjs'
import { toISODate } from '@/lib/utils/date'

/** Tháng đang xem, dạng `YYYY-MM`. Dùng luôn làm mảnh query key. */
export type MonthKey = string

export function toMonthKey(d: dayjs.Dayjs | Date): MonthKey {
  return dayjs(d).format('YYYY-MM')
}

export function currentMonthKey(): MonthKey {
  return toMonthKey(dayjs())
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  return toMonthKey(dayjs(`${month}-01`).add(delta, 'month'))
}

/**
 * Khoảng ngày nửa mở `[start, endExclusive)` của một tháng. Mốc cuối là ngày 1
 * tháng sau chứ không phải ngày cuối tháng, nên không phải phân biệt 28/29/30/31.
 */
export function monthRange(month: MonthKey): { startISO: string; endExclusiveISO: string } {
  const start = dayjs(`${month}-01`).startOf('month')
  return {
    startISO: toISODate(start),
    endExclusiveISO: toISODate(start.add(1, 'month')),
  }
}

export interface DateRange {
  startISO: string
  endExclusiveISO: string
}

/** Ngày bắt đầu kỳ hạn mức lớn nhất: tháng nào cũng có ngày 28. */
export const MAX_BUDGET_CYCLE_START_DAY = 28

/**
 * Giá trị từ DB về số hợp lệ. Cột chưa có (DB chưa chạy migration 0016) hay
 * giá trị lạ thì về 1 — tức tính theo tháng dương lịch như trước.
 */
export function normalizeCycleStartDay(value: unknown): number {
  const n = Math.trunc(Number(value))
  return n >= 1 && n <= MAX_BUDGET_CYCLE_START_DAY ? n : 1
}

/**
 * Kỳ hạn mức ứng với tháng đang xem, khi kỳ bắt đầu vào ngày `startDay`
 * (vd. lương về ngày 5 → kỳ 5/11 – 4/12 là "kỳ tháng 11").
 *
 * Riêng tháng hiện tại mà chưa tới ngày bắt đầu (hôm nay 3/11, kỳ bắt đầu
 * ngày 5) thì kỳ đang chạy là 5/10 – 4/11: trang Tổng quan phải nói về kỳ
 * mình đang tiêu, không phải kỳ chưa bắt đầu.
 */
export function budgetCycleRange(month: MonthKey, startDay: number, todayISO: string): DateRange {
  if (startDay <= 1) return monthRange(month)
  let start = dayjs(`${month}-01`).date(startDay)
  const today = dayjs(todayISO)
  if (toMonthKey(today) === month && today.date() < startDay) start = start.subtract(1, 'month')
  return { startISO: toISODate(start), endExclusiveISO: toISODate(start.add(1, 'month')) }
}

/**
 * Ngày trong tháng của hôm nay, nếu `month` đúng là tháng đang diễn ra — dùng
 * làm mốc cắt khi so sánh với tháng trước. `null` khi tháng đã kết thúc (hoặc
 * còn ở tương lai): lúc đó dữ liệu đã đủ tháng nên so trọn tháng mới đúng.
 */
export function partialMonthCutoffDay(month: MonthKey): number | null {
  const now = dayjs()
  return toMonthKey(now) === month ? now.date() : null
}

/** Chỉ số 0-11 để tra vào `t.mon`, cộng với năm để dựng nhãn "thg 8 2026". */
export function monthLabelParts(month: MonthKey): { monthIndex: number; year: number } {
  const d = dayjs(`${month}-01`)
  return { monthIndex: d.month(), year: d.year() }
}

/**
 * `months` kỳ liên tiếp, mỗi kỳ cách nhau một tháng, bắt đầu từ `startISO`.
 *
 * dayjs tự kẹp ngày vào cuối tháng ngắn hơn (31/1 + 1 tháng = 28/2) và luôn
 * tính từ mốc gốc, nên kỳ tháng 3 quay lại đúng ngày 31 thay vì trôi dần về 28.
 * Đây là hành vi mong muốn cho tiền nhà / tiền mạng đóng vào ngày cố định.
 */
export function buildMonthlyRepeatDates(startISO: string, months: number): string[] {
  const base = dayjs(startISO)
  return Array.from({ length: months }, (_, i) => toISODate(base.add(i, 'month')))
}
