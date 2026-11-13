/**
 * "HH:mm" theo ngôn ngữ của một mốc thời gian (ms) — giờ của lần dữ liệu về gần
 * nhất. Chuỗi rỗng khi chưa từng có dữ liệu (`0`).
 */
export function formatClockTime(timestampMs: number, locale: string): string {
  return timestampMs
    ? new Date(timestampMs).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : ''
}
