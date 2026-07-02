import { rgba } from '@/lib/utils/color'
import type { DerivedTheme } from '@/features/theme/types'

interface DayOfWeekPickerProps {
  labels: readonly string[]
  selected: number[]
  onToggle: (dow: number) => void
  theme: DerivedTheme
}

/** Mon=0..Sun=6 multi-select chips, used to add the same event on several days at once. */
export function DayOfWeekPicker({ labels, selected, onToggle, theme }: DayOfWeekPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label, dow) => {
        const active = selected.includes(dow)
        return (
          <button
            key={dow}
            type="button"
            onClick={() => onToggle(dow)}
            className="rounded-xl border-[1.5px] px-3 py-1.5 text-[12.5px] font-bold"
            style={{
              borderColor: active ? theme.accent : theme.border,
              background: active ? rgba(theme.accent, 0.16) : 'transparent',
              color: active ? theme.accent : theme.muted,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
