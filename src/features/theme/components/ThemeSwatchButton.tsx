import type { DerivedTheme, ThemeDefinition } from '../types'
import type { Locale } from '@/features/i18n/types'

interface ThemeSwatchButtonProps {
  def: ThemeDefinition
  active: boolean
  activeTheme: DerivedTheme
  locale: Locale
  onSelect: () => void
}

export function ThemeSwatchButton({
  def,
  active,
  activeTheme,
  locale,
  onSelect,
}: ThemeSwatchButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative overflow-hidden rounded-[20px] border-[2.5px] p-0 transition-transform hover:-translate-y-0.5"
      style={{
        borderColor: active ? def.accent : activeTheme.border,
        background: activeTheme.chip,
      }}
    >
      <div className="relative h-[74px]" style={{ background: def.sideGrad }}>
        <div className="absolute top-2 right-2 text-base">{def.icon}</div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className="h-3.5 w-3.5 flex-shrink-0 rounded-full"
          style={{ background: def.accent }}
        />
        <span className="text-sm font-bold" style={{ color: activeTheme.text }}>
          {def.name[locale]}
        </span>
      </div>
      {active && (
        <div
          className="absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-extrabold shadow-md"
          style={{ color: def.accent }}
        >
          ✓
        </div>
      )}
    </button>
  )
}
