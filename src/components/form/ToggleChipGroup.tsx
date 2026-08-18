import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { FieldColors } from './fieldColors'

interface ToggleChipGroupProps<T extends string> {
  options: { value: T; label: ReactNode }[]
  value: T[]
  onChange: (next: T[]) => void
  colors: FieldColors
  /** Selections below this cannot be removed. */
  min?: number
  max?: number
  /**
   * Show each chip's 1-based position. Use when the consumer cycles through the
   * array by index, so the order is a visible property rather than a hidden one.
   */
  showOrder?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Multi-select chips.
 *
 * Toggling on **appends**, so the selection array preserves the order the user
 * picked in. That matters wherever the consumer walks the array by index.
 */
export function ToggleChipGroup<T extends string>({
  options,
  value,
  onChange,
  colors,
  min = 0,
  max,
  showOrder = false,
  className,
  'aria-label': ariaLabel,
}: ToggleChipGroupProps<T>) {
  const toggle = (option: T) => {
    const index = value.indexOf(option)
    if (index === -1) {
      if (max !== undefined && value.length >= max) return
      onChange([...value, option])
      return
    }
    if (value.length <= min) return
    onChange(value.filter((item) => item !== option))
  }

  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((option) => {
        const order = value.indexOf(option.value)
        const active = order !== -1
        const atMax = !active && max !== undefined && value.length >= max
        const atMin = active && value.length <= min

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={atMax}
            onClick={() => toggle(option.value)}
            className="relative grid size-11 place-items-center rounded-[13px] border-[1.5px] transition-transform disabled:opacity-40 enabled:hover:scale-[1.04]"
            style={{
              borderColor: active ? colors.accent : colors.border,
              background: active ? colors.chip : 'transparent',
              // The chip stays clickable at the minimum — it just can't turn off —
              // so `disabled` would be a lie. Only the max is a real dead end.
              cursor: atMin ? 'default' : undefined,
            }}
          >
            {option.label}
            {showOrder && active && (
              <span
                className="absolute -top-1.5 -right-1.5 grid size-[17px] place-items-center rounded-full text-[10px] font-extrabold text-white"
                style={{ background: colors.accent }}
              >
                {order + 1}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
