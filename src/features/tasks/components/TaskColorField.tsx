import type { DerivedTheme } from '@/features/theme/types'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { TASK_COLOR_PRESETS } from '../data/taskColorPresets'

interface TaskColorFieldProps {
  /** `null` means "follow the category" — the default for every task. */
  value: string | null
  onChange: (next: string | null) => void
  /** Previewed on the "follow the category" chip so the choice is visible. */
  categoryColor: string
  theme: DerivedTheme
}

/** Rainbow ring on the custom swatch, shown until a custom colour is picked. */
const HUE_WHEEL =
  'conic-gradient(#ff5d7a,#ff9d5c,#f2d24b,#5fd0a0,#4bb4f0,#7b83ff,#b47cf0,#ff5d7a)'

function isPreset(color: string) {
  return TASK_COLOR_PRESETS.includes(color.toLowerCase())
}

/**
 * Colour override for one task: follow the category, take a preset, or pick
 * anything via the OS colour picker.
 *
 * The native `<input type="color">` is deliberately the escape hatch rather than
 * the main control — it hands back exactly the `#rrggbb` form the column's check
 * constraint accepts, so no parsing or normalising sits between the picker and
 * the database.
 */
export function TaskColorField({ value, onChange, categoryColor, theme }: TaskColorFieldProps) {
  const { t } = useTranslation()
  const custom = value !== null && !isPreset(value)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className="flex h-8 items-center gap-1.5 rounded-full border-[1.5px] px-2.5 text-[11px] font-extrabold"
        style={{
          borderColor: value === null ? theme.accent : theme.border,
          background: value === null ? theme.chip : 'transparent',
          color: theme.text,
        }}
      >
        <span
          className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
          style={{ background: categoryColor }}
        />
        {t.taskColorAuto}
      </button>

      {TASK_COLOR_PRESETS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="h-8 w-8 rounded-full border-2 transition-transform"
          style={{
            background: color,
            borderColor: value === color ? theme.text : 'transparent',
            transform: value === color ? 'scale(1.12)' : undefined,
          }}
          aria-label={color}
        />
      ))}

      <label
        className="relative grid h-8 w-8 place-items-center rounded-full border-2 transition-transform"
        style={{
          background: custom ? value : HUE_WHEEL,
          borderColor: custom ? theme.text : 'transparent',
          transform: custom ? 'scale(1.12)' : undefined,
        }}
        title={t.taskColorCustom}
      >
        <input
          type="color"
          value={value ?? categoryColor}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={t.taskColorCustom}
        />
      </label>
    </div>
  )
}
