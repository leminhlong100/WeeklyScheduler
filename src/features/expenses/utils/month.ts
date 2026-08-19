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
