import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { currentMonthKey, type MonthKey } from '../utils/month'
import { SheetDialog } from './SheetDialog'

/**
 * Lưới 12 tháng + đổi năm. Trước đây muốn xem lại tháng 3 phải bấm ‹ tám lần,
 * và trên điện thoại không có nút quay về tháng hiện tại.
 */
export function MonthPicker({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: MonthKey
  onChange: (month: MonthKey) => void
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [year, setYear] = useState(() => Number(value.slice(0, 4)))
  const current = currentMonthKey()

  const pick = (monthIndex: number) => {
    onChange(`${year}-${String(monthIndex + 1).padStart(2, '0')}`)
    onOpenChange(false)
  }

  return (
    <SheetDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setYear(Number(value.slice(0, 4)))
        onOpenChange(next)
      }}
      title={t.pickMonth}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYear((y) => y - 1)}
          aria-label={String(year - 1)}
          className="grid size-11 place-items-center rounded-full"
          style={{ background: theme.chip, color: theme.text }}
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="font-heading text-lg font-extrabold tabular-nums">{year}</div>
        <button
          type="button"
          onClick={() => setYear((y) => y + 1)}
          aria-label={String(year + 1)}
          className="grid size-11 place-items-center rounded-full"
          style={{ background: theme.chip, color: theme.text }}
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {t.mon.map((name, i) => {
          const key = `${year}-${String(i + 1).padStart(2, '0')}`
          const selected = key === value
          const isCurrent = key === current
          return (
            <button
              key={key}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={selected}
              className="min-h-12 rounded-[14px] border-[1.5px] text-[14px] font-extrabold transition-transform active:scale-95"
              style={{
                borderColor: isCurrent ? theme.accent : theme.border,
                background: selected ? theme.accent : theme.chip,
                color: selected ? '#fff' : theme.text,
              }}
            >
              {name}
            </button>
          )
        })}
      </div>
      {value !== current && (
        <button
          type="button"
          onClick={() => {
            onChange(current)
            onOpenChange(false)
          }}
          className="min-h-11 rounded-[14px] text-[14px] font-extrabold"
          style={{ background: theme.inputBg, color: theme.accent }}
        >
          {t.backToThisMonth}
        </button>
      )}
    </SheetDialog>
  )
}
