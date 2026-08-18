import { useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

import { isHex, normalizeHex } from '@/lib/utils/color'
import { cn } from '@/lib/utils'
import type { FieldColors } from './fieldColors'

interface ColorFieldProps {
  label: string
  value: string
  onChange: (hex: string) => void
  colors: FieldColors
  /** Optional row of one-tap suggestions. */
  presets?: string[]
  /** Rendered to the right of the label — typically a contrast readout. */
  badge?: ReactNode
  /** Shown when the value differs from its derived default. */
  onReset?: () => void
  resetLabel?: string
  className?: string
}

/**
 * Hex colour input with a native swatch picker.
 *
 * The text field holds *draft* text while the user types, and only commits on a
 * valid parse. Committing every keystroke would fire `onChange` for `#`, `#f`,
 * `#ff` … and each of those rebuilds the whole theme; worse, normalising
 * mid-typing fights the caret. Invalid text is left visible and simply not
 * propagated, and blur snaps back to the last good value.
 */
export function ColorField({
  label,
  value,
  onChange,
  colors,
  presets,
  badge,
  onReset,
  resetLabel,
  className,
}: ColorFieldProps) {
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)

  // Adjust-state-during-render rather than an effect: this has to follow external
  // changes (a preset reseed, randomise, reset) without clobbering what the user
  // is typing. The equality check is on the *normalised* value, so typing
  // `#ABCDEF` isn't lowercased under the caret the moment it becomes valid.
  if (value !== lastValue) {
    setLastValue(value)
    if (!isHex(draft) || normalizeHex(draft) !== normalizeHex(value)) setDraft(value)
  }

  const commit = (next: string) => {
    setDraft(next)
    if (isHex(next)) onChange(normalizeHex(next))
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold" style={{ color: colors.muted }}>
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {badge}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label={resetLabel}
              title={resetLabel}
              className="grid size-5 place-items-center rounded-md"
              style={{ color: colors.muted }}
            >
              <RotateCcw className="size-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label
          className="relative size-8 shrink-0 overflow-hidden rounded-[10px] border-[1.5px]"
          style={{ borderColor: colors.border, background: isHex(draft) ? draft : value }}
        >
          <input
            type="color"
            value={isHex(draft) ? normalizeHex(draft) : normalizeHex(value)}
            onChange={(event) => commit(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>

        <input
          value={draft}
          onChange={(event) => commit(event.target.value.trim())}
          onBlur={() => setDraft(value)}
          spellCheck={false}
          autoComplete="off"
          className="h-8 min-w-0 flex-1 rounded-[10px] border-[1.5px] px-2 font-mono text-[12px] font-bold outline-none"
          style={{
            background: colors.inputBg,
            // A live signal that the text isn't a colour yet, without an error row
            // appearing and shifting every field below it on each keystroke.
            borderColor: isHex(draft) ? colors.border : '#ff5d7a',
            color: colors.text,
          }}
        />
      </div>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => commit(preset)}
              aria-label={preset}
              title={preset}
              className="size-5 rounded-full border-[1.5px] transition-transform hover:scale-110"
              style={{
                background: preset,
                borderColor:
                  normalizeHex(preset) === normalizeHex(value) ? colors.accent : colors.border,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
