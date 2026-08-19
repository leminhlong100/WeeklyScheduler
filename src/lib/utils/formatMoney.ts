import type { Currency } from '@/lib/supabase/database.types'
import type { Locale } from '@/features/i18n/types'

/**
 * Số chữ số thập phân theo tập quán của từng đơn vị. VND và JPY không dùng phần
 * lẻ (không ai ghi 40.000,00 ₫), USD thì có. `Intl` biết chuyện này, nhưng chỉ
 * khi `style: 'currency'` — ép cứng ở đây để cả hai nhánh format đều nhất quán.
 */
const FRACTION_DIGITS: Record<Currency, number> = { VND: 0, JPY: 0, USD: 2 }

/** Locale của app -> BCP-47 để `Intl` chọn đúng dấu phân cách và vị trí ký hiệu. */
const INTL_LOCALE: Record<Locale, string> = {
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
