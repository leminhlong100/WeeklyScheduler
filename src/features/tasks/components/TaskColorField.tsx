import { ColorSwatches } from '@/components/form/ColorSwatches'
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

/**
 * Colour override for one task: follow the category, take a preset, or pick
 * anything via the OS colour picker.
 */
export function TaskColorField({ value, onChange, categoryColor, theme }: TaskColorFieldProps) {
  const { t } = useTranslation()

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

      <ColorSwatches
        value={value}
        onChange={onChange}
        presets={TASK_COLOR_PRESETS}
        ringColor={theme.text}
        customLabel={t.customColor}
        fallbackColor={categoryColor}
      />
    </div>
  )
}
