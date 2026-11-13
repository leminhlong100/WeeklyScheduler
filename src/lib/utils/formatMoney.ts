import type { Currency } from '@/lib/supabase/database.types'
import type { Locale } from '@/features/i18n/types'

/**
 * Số chữ số thập phân theo tập quán của từng đơn vị. VND và JPY không dùng phần
 * lẻ (không ai ghi 40.000,00 ₫), USD thì có. `Intl` biết chuyện này, nhưng chỉ
 * khi `style: 'currency'` — ép cứng ở đây để cả hai nhánh format đều nhất quán.
 */
const FRACTION_DIGITS: Record<Currency, number> = { VND: 0, JPY: 0, USD: 2 }

/** Locale của app -> BCP-47 để `Intl` chọn đúng dấu phân cách và vị trí ký hiệu. */
export const INTL_LOCALE: Record<Locale, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
}

/** "40.000 ₫" — số tiền kèm ký hiệu đơn vị, theo locale người dùng đang chọn. */
export function formatMoney(amount: number, currency: Currency, locale: Locale): string {
  const digits = FRACTION_DIGITS[currency]
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

/**
 * Chỉ phần số, không ký hiệu đơn vị. Dùng khi đơn vị đã hiện ở chỗ khác (đầu
 * cột, nhãn tổng) — lặp lại "₫" trên từng dòng chỉ làm bảng ồn hơn.
 */
export function formatAmount(amount: number, currency: Currency, locale: Locale): string {
  const digits = FRACTION_DIGITS[currency]
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}

/**
 * Tỉ lệ 0..1 → "12,5%" theo locale. Tối đa một số lẻ, nhưng tỉ lệ nhỏ hơn 1%
 * mà khác 0 vẫn hiện ra (≥ 0,1%) thay vì làm tròn thành "0%" khi thanh biểu
 * đồ vẫn có một vệt.
 */
export function formatPercent(ratio: number, locale: Locale): string {
  const digits = Math.abs(ratio) < 0.1 ? 1 : 0
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'percent',
    maximumFractionDigits: digits,
  }).format(ratio)
}

/** Dấu trừ thật (U+2212), cùng độ rộng với "+" trong font tabular-nums. */
const MINUS = '−'

/**
 * Số tiền kèm dấu, MỘT quy tắc cho cả app:
 * - `'expense'`: luôn "−40.000 ₫" (amount trong DB luôn dương, dấu nằm ở kind);
 * - `'income'`: luôn "+40.000 ₫";
 * - `'auto'` (số dư): âm thì "−", dương/0 không dấu.
 * Trước đây hàng chi không có dấu nhưng tổng ngày lại có "−", và số dư âm đi
 * qua `Intl` ra dấu "-" ngắn lệch cột.
 */
export function formatSignedMoney(
  amount: number,
  currency: Currency,
  locale: Locale,
  sign: 'expense' | 'income' | 'auto',
): string {
  const abs = formatMoney(Math.abs(amount), currency, locale)
  if (sign === 'income') return `+${abs}`
  if (sign === 'expense') return `${MINUS}${abs}`
  return amount < 0 ? `${MINUS}${abs}` : abs
}
