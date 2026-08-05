import { EmojiField } from '@/components/form/EmojiField'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { ThemeSwatchButton } from '../../components/ThemeSwatchButton'
import { listThemeDefinitions } from '../../themes'
import { isThemeKey, type ThemeKey } from '../../types'
import type { StudioTabProps } from '../types'

const THEME_ICON_PRESETS = [
  '🎨', '🌿', '🌸', '🌙', '⭐', '🍵', '🍓', '🧁',
  '🌊', '🔮', '🦄', '🐈', '☁️', '🌈', '🍋', '💜',
] as const

export function BasicsTab({ draft, chrome, t }: StudioTabProps) {
  const { locale } = useTranslation()
  const { state, dispatch } = draft

  const reseed = (preset: ThemeKey) => {
    if (preset === state.recipe.basePreset) return
    // Only warn once there is something to lose. Confirming on an untouched draft
    // would make browsing the presets feel like a commitment.
    if (state.dirty && !window.confirm(t.studioReseedConfirm)) return
    dispatch({ type: 'reseed', preset })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
          {t.studioName}
        </span>
        <input
          value={state.name}
          onChange={(event) => dispatch({ type: 'identity', name: event.target.value })}
          placeholder={t.studioNamePh}
          maxLength={40}
          className="h-9 rounded-[12px] border-[1.5px] px-2.5 text-[13px] font-bold outline-none"
          style={{ background: chrome.inputBg, borderColor: chrome.border, color: chrome.text }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
          {t.studioIcon}
        </span>
        <EmojiField
          value={state.icon}
          onChange={(icon) => dispatch({ type: 'identity', icon })}
          presets={THEME_ICON_PRESETS}
          colors={chrome}
          allowCustom
          customPlaceholder={t.studioIconPh}
          aria-label={t.studioIcon}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
          {t.studioMode}
        </span>
        <SegmentedControl
          value={state.recipe.mode}
          onChange={(mode) => dispatch({ type: 'recipe', patch: { mode } })}
          options={[
            { value: 'light', label: t.studioModeLight },
            { value: 'dark', label: t.studioModeDark },
          ]}
          trackColor={chrome.chip}
          activeColor={chrome.accent}
          activeTextColor="#ffffff"
          textColor={chrome.muted}
          aria-label={t.studioMode}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
          {t.studioBasedOn}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {listThemeDefinitions().map((def) => {
            // Narrow rather than index into THEME_KEYS in parallel: every entry
            // here is a preset, and proving it beats relying on two lists staying
            // in the same order.
            if (!isThemeKey(def.key)) return null
            const preset = def.key
            return (
              <ThemeSwatchButton
                key={preset}
                def={def}
                active={preset === state.recipe.basePreset}
                activeTheme={chrome}
                locale={locale}
                onSelect={() => reseed(preset)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
