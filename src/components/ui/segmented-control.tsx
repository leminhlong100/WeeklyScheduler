import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  /** Track background. */
  trackColor?: string
  /** Background of the selected segment. */
  activeColor?: string
  activeTextColor?: string
  textColor?: string
  className?: string
  'aria-label'?: string
}

/**
 * A small one-of-N picker.
 *
 * Built on native radios rather than a listbox primitive: arrow-key navigation,
 * a single tab stop, and the roving focus behaviour all come for free from the
 * radio group semantics, which is exactly the interaction a segmented control
 * should have.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  trackColor,
  activeColor,
  activeTextColor,
  textColor,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex w-full gap-1 rounded-[14px] p-1', className)}
      style={{ background: trackColor }}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className="flex-1 rounded-[10px] px-2.5 py-1.5 text-[12px] font-extrabold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-current/30"
            style={{
              background: active ? activeColor : 'transparent',
              color: active ? activeTextColor : textColor,
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
