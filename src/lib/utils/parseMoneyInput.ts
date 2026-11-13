import type { Currency } from '@/lib/supabase/database.types'

/**
 * Đọc số tiền người dùng GÕ TAY, theo cách người Việt thực sự gõ.
 *
 * Lý do tồn tại: ô tiền cũ là `<input type="number">` + `Number(v)`. Gõ
 * "30.000" (cách viết của người Việt) thì dấu chấm bị hiểu là dấu thập phân →
 * lưu 30 ₫ mà không có cảnh báo nào. Dán "30k" thì trình duyệt trả chuỗi rỗng.
 *
 * Quy tắc:
 * - VND/JPY không có phần lẻ: mọi `.` `,` khoảng trắng đều là dấu nhóm nghìn.
 * - USD: dấu `.`/`,` CUỐI CÙNG theo sau bởi đúng 1–2 chữ số là dấu thập phân,
 *   còn lại là dấu nhóm. Không phụ thuộc locale nên "12.50" và "12,50" đều ra
 *   12,5 USD, còn "1.234" / "1,234" ra 1234.
 * - Hậu tố: k / nghìn / ngàn → ×1.000; tr / triệu / m → ×1.000.000; tỷ / ty →
 *   ×1.000.000.000. Có hậu tố thì `,` hoặc `.` trước đó là dấu thập phân
 *   ("1,5tr" = 1.500.000), trừ khi theo sau là đúng 3 chữ số ("1.500k").
 * - Ký hiệu tiền (₫ đ vnd ¥ 円 yen $ usd) được bỏ qua.
 */

/** Trần của cột `numeric(14,2)`: 12 chữ số phần nguyên. */
export const MAX_AMOUNT = 999_999_999_999.99

export type MoneyInputError = 'invalid' | 'whole' | 'tooLarge'

export type MoneyParseResult =
  | { ok: true; value: number; canonical: string }
  | { ok: false; error: MoneyInputError }

const WHOLE_ONLY: Record<Currency, boolean> = { VND: true, JPY: true, USD: false }

const MULTIPLIERS: Array<[RegExp, number]> = [
  [/(?:tỷ|tỉ|ty|ti)$/u, 1_000_000_000],
  [/(?:triệu|trieu|tr|m)$/u, 1_000_000],
  [/(?:nghìn|nghin|ngàn|ngan|k)$/u, 1_000],
]

const CURRENCY_WORDS = /(?:₫|vnđ|vnd|đồng|dong|đ|¥|円|yen|jpy|\$|usd)/giu

function stripSeparators(s: string): string {
  return s.replace(/[.,\s]/g, '')
}

/**
 * Tách phần số thành giá trị. `decimalDigitsMax` = số chữ số lẻ tối đa cho
 * phép coi dấu cuối là dấu thập phân (0 = không bao giờ).
 */
function parseNumberPart(s: string, decimalDigitsMax: number, suffix: boolean): number | null {
  if (!/^\d[\d.,\s]*$/.test(s)) return null
  const trimmed = s.replace(/\s/g, '')
  if (decimalDigitsMax > 0 || suffix) {
    const m = /^(.*)[.,](\d+)$/.exec(trimmed)
    if (m) {
      const [, intPart, frac] = m
      const isDecimal = suffix ? frac.length !== 3 : frac.length <= decimalDigitsMax
      if (isDecimal) {
        const intDigits = stripSeparators(intPart)
        if (intDigits === '' || !/^\d+$/.test(intDigits)) return null
        return Number(`${intDigits}.${frac}`)
      }
    }
  }
  const digits = stripSeparators(trimmed)
  if (!/^\d+$/.test(digits)) return null
  return Number(digits)
}

export function parseMoneyInput(raw: string, currency: Currency): MoneyParseResult {
  let s = raw.trim().toLowerCase().replace(CURRENCY_WORDS, '').trim()
  if (s === '') return { ok: false, error: 'invalid' }

  let multiplier = 1
  for (const [re, mult] of MULTIPLIERS) {
    if (re.test(s)) {
      s = s.replace(re, '').trim()
      multiplier = mult
      break
    }
  }

  const base = parseNumberPart(s, WHOLE_ONLY[currency] ? 0 : 2, multiplier !== 1)
  if (base === null) return { ok: false, error: 'invalid' }

  // Nhân qua số nguyên để 1,5 × 1.000.000 không ra 1499999.9999.
  const value = Math.round(base * multiplier * 100) / 100
  if (!(value > 0)) return { ok: false, error: 'invalid' }
  if (value > MAX_AMOUNT) return { ok: false, error: 'tooLarge' }
  if (WHOLE_ONLY[currency] && !Number.isInteger(value)) return { ok: false, error: 'whole' }

  return { ok: true, value, canonical: String(value) }
}

/** Ký tự thập phân của locale: `,` cho vi-VN, `.` cho en/zh/ja. */
export function decimalSeparator(intlLocale: string): string {
  return (
    new Intl.NumberFormat(intlLocale).formatToParts(1.5).find((p) => p.type === 'decimal')
      ?.value ?? '.'
  )
}

/**
 * Định dạng lại chuỗi đang gõ (chỉ gồm chữ số + dấu) để hiển thị có dấu nhóm
 * nghìn: "30000" → "30.000" (vi) / "30,000" (en). Trả `null` khi chuỗi có chữ
 * (đang gõ hậu tố "30k") — lúc đó giữ nguyên chữ người dùng gõ, chỉ chuẩn hoá
 * khi rời ô.
 *
 * USD: dấu thập phân theo locale được giữ, phần lẻ tối đa 2 chữ số.
 */
export function formatTypingAmount(
  raw: string,
  currency: Currency,
  intlLocale: string,
): string | null {
  if (raw === '') return ''
  if (!/^[\d.,\s]*$/.test(raw)) return null

  const group = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 })
  if (WHOLE_ONLY[currency]) {
    const digits = stripSeparators(raw).replace(/^0+(?=\d)/, '')
    if (digits === '') return ''
    return group.format(Number(digits))
  }

  const dec = decimalSeparator(intlLocale)
  const idx = raw.lastIndexOf(dec)
  const intRaw = idx >= 0 ? raw.slice(0, idx) : raw
  const fracRaw = idx >= 0 ? raw.slice(idx + 1).replace(/\D/g, '').slice(0, 2) : null
  const intDigits = stripSeparators(intRaw).replace(/^0+(?=\d)/, '')
  const intShown = intDigits === '' ? (fracRaw !== null ? '0' : '') : group.format(Number(intDigits))
  return fracRaw !== null ? `${intShown}${dec}${fracRaw}` : intShown
}

/** Số tiền đã lưu → chuỗi hiển thị trong ô khi mở form sửa. */
export function formatStoredAmount(value: number, currency: Currency, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: WHOLE_ONLY[currency] ? 0 : 2,
    useGrouping: true,
  }).format(value)
}
