import { cn } from '@/lib/utils'
import type { FieldColors } from './fieldColors'

interface EmojiFieldProps {
  value: string
  onChange: (emoji: string) => void
  presets: readonly string[]
  colors: FieldColors
  columns?: number
  /**
   * Adds a free-text box. The presets are a shortcut, not the vocabulary — a
   * user naming a theme after their cat should be able to paste 🐈.
   */
  allowCustom?: boolean
  customPlaceholder?: string
  className?: string
  'aria-label'?: string
}

/** Emoji picker: a preset grid, optionally with a free-text escape hatch. */
export function EmojiField({
  value,
  onChange,
  presets,
  colors,
  columns = 8,
  allowCustom = false,
  customPlaceholder,
  className,
  'aria-label': ariaLabel,
}: EmojiFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {presets.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={emoji === value}
            onClick={() => onChange(emoji)}
            className="grid aspect-square place-items-center rounded-xl border-[1.5px] text-base"
            style={{
              borderColor: emoji === value ? colors.accent : colors.border,
              background: colors.chip,
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {allowCustom && (
        <input
          value={presets.includes(value) ? '' : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={customPlaceholder}
          maxLength={16}
          className="h-9 rounded-[12px] border-[1.5px] px-2.5 text-center text-base outline-none"
          style={{ background: colors.inputBg, borderColor: colors.border, color: colors.text }}
        />
      )}
    </div>
  )
}
