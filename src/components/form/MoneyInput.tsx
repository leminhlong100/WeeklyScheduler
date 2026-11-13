import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Currency } from '@/lib/supabase/database.types'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { INTL_LOCALE } from '@/lib/utils/formatMoney'
import {
  formatStoredAmount,
  formatTypingAmount,
  parseMoneyInput,
} from '@/lib/utils/parseMoneyInput'
import { cn } from '@/lib/utils'

const SYMBOL: Record<Currency, string> = { VND: '₫', JPY: '¥', USD: '$' }

/** Nút cộng nhanh dưới ô tiền. `append` = nối thêm chữ số ("000"), `add` = cộng số. */
type QuickChip = { label: string; append?: string; add?: number }

const QUICK_CHIPS: Record<Currency, QuickChip[]> = {
  VND: [
    { label: '000', append: '000' },
    { label: '+10k', add: 10_000 },
    { label: '+50k', add: 50_000 },
    { label: '+100k', add: 100_000 },
  ],
  JPY: [
    { label: '00', append: '00' },
    { label: '+100', add: 100 },
    { label: '+1.000', add: 1_000 },
    { label: '+5.000', add: 5_000 },
  ],
  USD: [
    { label: '+1', add: 1 },
    { label: '+5', add: 5 },
    { label: '+10', add: 10 },
    { label: '+50', add: 50 },
  ],
}

export interface MoneyInputProps {
  id?: string
  name?: string
  /**
   * Giá trị trong form: chuỗi số thô ("30000", "12.5") khi đọc được, hoặc đúng
   * chữ người dùng gõ khi chưa đọc được — để schema báo lỗi thay vì âm thầm
   * nuốt mất.
   */
  value: string
  onChange: (next: string) => void
  onBlur?: () => void
  currency: Currency
  placeholder?: string
  /** `lg` cho form nhập tay (số to, dễ đọc), `sm` cho bảng nháp chật chỗ. */
  size?: 'sm' | 'md' | 'lg'
  showChips?: boolean
  invalid?: boolean
  autoFocus?: boolean
  style?: CSSProperties
  chipStyle?: CSSProperties
  className?: string
  'aria-label'?: string
}

function displayFor(value: string, currency: Currency, intlLocale: string): string {
  if (value === '') return ''
  const parsed = parseMoneyInput(value, currency)
  return parsed.ok ? formatStoredAmount(parsed.value, currency, intlLocale) : value
}

/** Vị trí ngay sau chữ số thứ `n` (đếm từ trái) trong `s`. */
function caretAfterDigits(s: string, n: number): number {
  if (n <= 0) {
    const first = s.search(/\d/)
    return first === -1 ? s.length : first
  }
  let seen = 0
  for (let i = 0; i < s.length; i += 1) {
    if (/\d/.test(s[i])) {
      seen += 1
      if (seen === n) return i + 1
    }
  }
  return s.length
}

/**
 * Ô nhập tiền dùng chung cho form tay, bảng nháp AI và ô hạn mức.
 *
 * - `type="text"` + `inputMode` số: `type="number"` hiểu "30.000" là 30.
 * - Có dấu nhóm nghìn NGAY KHI GÕ, theo locale ("30.000" / "30,000").
 * - Giữ vị trí con trỏ theo số chữ số đứng trước nó, nên sửa ở giữa số không
 *   làm con trỏ nhảy về cuối.
 * - Gõ hậu tố ("30k", "1,5tr") thì giữ nguyên chữ, rời ô mới đổi thành số đầy đủ.
 */
export function MoneyInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  currency,
  placeholder,
  size = 'md',
  showChips = false,
  invalid,
  autoFocus,
  style,
  chipStyle,
  className,
  'aria-label': ariaLabel,
}: MoneyInputProps) {
  const { locale } = useTranslation()
  const intlLocale = INTL_LOCALE[locale]
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const [display, setDisplay] = useState(() => displayFor(value, currency, intlLocale))
  // Bộ giá trị mà `display` đang phản ánh. Chính ô này đẩy giá trị ra thì cập
  // nhật luôn ở đây; khác đi nghĩa là form đổi từ ngoài (reset, đổi dòng nháp,
  // đổi tiền tệ, đổi ngôn ngữ) → dựng lại chữ hiển thị.
  const [shownFor, setShownFor] = useState({ value, currency, intlLocale })

  if (
    shownFor.value !== value ||
    shownFor.currency !== currency ||
    shownFor.intlLocale !== intlLocale
  ) {
    setShownFor({ value, currency, intlLocale })
    setDisplay(displayFor(value, currency, intlLocale))
  }

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && inputRef.current) {
      const pos = pendingCaret.current
      pendingCaret.current = null
      inputRef.current.setSelectionRange(pos, pos)
    }
  })

  const emit = (next: string) => {
    setShownFor((s) => ({ ...s, value: next }))
    onChange(next)
  }

  const handleChange = (raw: string, caret: number | null) => {
    // Chặn dấu trừ ngay từ đầu: tiền luôn dương, dấu nằm ở Chi/Thu.
    const cleaned = raw.replace(/-/g, '')
    const formatted = formatTypingAmount(cleaned, currency, intlLocale)
    const shown = formatted ?? cleaned
    if (formatted !== null && caret !== null) {
      const digitsBefore = cleaned.slice(0, caret).replace(/\D/g, '').length
      pendingCaret.current = caretAfterDigits(shown, digitsBefore)
    }
    setDisplay(shown)
    const parsed = parseMoneyInput(shown, currency)
    emit(parsed.ok ? parsed.canonical : shown.trim())
  }

  const handleBlur = () => {
    const parsed = parseMoneyInput(display, currency)
    if (parsed.ok) setDisplay(formatStoredAmount(parsed.value, currency, intlLocale))
    onBlur?.()
  }

  const applyChip = (chip: QuickChip) => {
    const parsed = parseMoneyInput(display, currency)
    const current = parsed.ok ? parsed.value : 0
    let next: number
    if (chip.append) {
      if (!parsed.ok) return
      next = Number(`${Math.trunc(current)}${chip.append}`)
    } else {
      next = Math.round((current + (chip.add ?? 0)) * 100) / 100
    }
    const check = parseMoneyInput(String(next), currency)
    if (!check.ok) return
    setDisplay(formatStoredAmount(check.value, currency, intlLocale))
    emit(check.canonical)
  }

  const sizeClass =
    size === 'lg'
      ? 'h-14 text-[26px] font-extrabold pr-11'
      : size === 'sm'
        ? 'h-11 text-base font-bold pr-7 sm:h-9 sm:text-sm'
        : 'h-11 text-lg font-bold pr-9'

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode={currency === 'USD' ? 'decimal' : 'numeric'}
          autoComplete="off"
          enterKeyHint="done"
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          placeholder={placeholder}
          value={display}
          onChange={(e) => handleChange(e.target.value, e.target.selectionStart)}
          onBlur={handleBlur}
          className={cn(
            'w-full min-w-0 rounded-lg border-[1.5px] px-3 tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-[#d6334f]',
            sizeClass,
            className,
          )}
          style={style}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-bold opacity-60',
            size === 'lg' ? 'text-xl' : size === 'sm' ? 'right-2 text-sm' : 'text-base',
          )}
          style={{ color: style?.color }}
        >
          {SYMBOL[currency]}
        </span>
      </div>
      {showChips && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS[currency].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => applyChip(chip)}
              className="min-h-9 min-w-[56px] rounded-[10px] border-[1.5px] px-3 text-[13px] font-bold tabular-nums transition-transform active:scale-95"
              style={chipStyle}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
