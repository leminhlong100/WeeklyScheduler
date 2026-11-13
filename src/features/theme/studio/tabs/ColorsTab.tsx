import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Shuffle } from 'lucide-react'

import { ColorField } from '@/components/form/ColorField'
import { EmojiField } from '@/components/form/EmojiField'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { oklchToHex, shiftHue } from '@/lib/utils/color'
import { hasBlockingIssue } from '../../recipe/validate'
import type { StudioTabProps } from '../types'

/** Offset that turns one accent into a plausible gradient partner. */
export const AUTO_SECONDARY_HUE_SHIFT = 65

const THEME_ICON_PRESETS = [
  '🎨', '🌿', '🌸', '🌙', '⭐', '🍵', '🍓', '🧁',
  '🌊', '🔮', '🦄', '🐈', '☁️', '🌈', '🍋', '💜',
] as const

/** Một hàng màu chạm-là-dùng: người dùng phổ thông chọn màu ở đây, không gõ mã hex. */
const SUGGESTED_ACCENTS = [
  '#8b7be8', '#ff7aa8', '#ff8a5c', '#f2b705', '#2fb58c',
  '#3fa7f5', '#5b6cff', '#b05cff', '#e0294b', '#5a6474',
] as const

function randomHex(): string {
  // Random in OKLCH, not in RGB: uniform RGB noise is mostly muddy dark colours,
  // while fixing lightness and chroma to the range the presets actually occupy
  // gives something usable on the first roll.
  const l = 0.55 + Math.random() * 0.2
  const c = 0.09 + Math.random() * 0.11
  return oklchToHex({ l, c, h: Math.random() * 360 })
}

const autoSecondary = (accent: string) => shiftHue(accent, AUTO_SECONDARY_HUE_SHIFT)

/**
 * Tab đầu của Studio: mọi thứ một người dùng phổ thông cần để có một giao diện
 * của riêng mình — tên, sáng/tối, một màu chính, độ rực — và một dòng cho biết
 * chữ có đọc được không. Phần còn lại nằm ở "Nâng cao".
 */
export function ColorsTab({ draft, chrome, t }: StudioTabProps) {
  const { state, dispatch, issues } = draft
  const { recipe } = state
  const [iconOpen, setIconOpen] = useState(false)

  // "Tự động" không phải một cờ lưu riêng: màu phụ đang đúng bằng màu tự suy ra
  // từ màu chính thì coi là đang tự động.
  const secondaryAuto = recipe.secondary.toLowerCase() === autoSecondary(recipe.accent).toLowerCase()

  const setAccent = (accent: string) =>
    dispatch({
      type: 'recipe',
      patch: secondaryAuto ? { accent, secondary: autoSecondary(accent) } : { accent },
    })

  const randomize = () => {
    const accent = randomHex()
    dispatch({
      type: 'recipe',
      patch: { accent, secondary: autoSecondary(accent), highlight: shiftHue(accent, -120) },
    })
  }

  const label = 'text-[12px] font-extrabold'
  const blocked = hasBlockingIssue(issues)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className={label} style={{ color: chrome.mutedText }}>
            {t.studioName}
          </span>
          <input
            value={state.name}
            onChange={(event) => dispatch({ type: 'identity', name: event.target.value })}
            onFocus={(event) => state.isNew && event.target.select()}
            placeholder={t.studioNamePh}
            maxLength={40}
            className="h-11 rounded-[12px] border-[1.5px] px-3 text-[16px] font-bold outline-none lg:h-10 lg:text-[14px]"
            style={{ background: chrome.inputBg, borderColor: chrome.border, color: chrome.text }}
          />
        </label>
        <button
          type="button"
          onClick={() => setIconOpen((open) => !open)}
          aria-expanded={iconOpen}
          aria-label={t.studioIcon}
          title={t.studioIcon}
          className="grid size-11 shrink-0 place-items-center rounded-[12px] border-[1.5px] text-xl lg:size-10"
          style={{ background: chrome.inputBg, borderColor: iconOpen ? chrome.accent : chrome.border }}
        >
          {state.icon}
        </button>
      </div>

      {iconOpen && (
        <EmojiField
          value={state.icon}
          onChange={(icon) => dispatch({ type: 'identity', icon })}
          presets={THEME_ICON_PRESETS}
          colors={chrome}
          allowCustom
          customPlaceholder={t.studioIconPh}
          aria-label={t.studioIcon}
        />
      )}

      <SegmentedControl
        value={recipe.mode}
        onChange={(mode) => dispatch({ type: 'recipe', patch: { mode } })}
        options={[
          { value: 'light', label: t.studioModeLight },
          { value: 'dark', label: t.studioModeDark },
        ]}
        trackColor={chrome.chip}
        activeColor={chrome.accentFill}
        activeTextColor={chrome.onAccent}
        textColor={chrome.mutedText}
        aria-label={t.studioMode}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className={label} style={{ color: chrome.mutedText }}>
            {t.studioAccent}
          </span>
          <button
            type="button"
            onClick={randomize}
            className="flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-extrabold"
            style={{ background: chrome.chip, color: chrome.text }}
          >
            <Shuffle className="size-3.5" />
            {t.studioRandomize}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2" role="group" aria-label={t.studioSuggested}>
          {SUGGESTED_ACCENTS.map((hex) => {
            const active = recipe.accent.toLowerCase() === hex
            return (
              <button
                key={hex}
                type="button"
                onClick={() => setAccent(hex)}
                aria-label={hex}
                aria-pressed={active}
                className="h-11 rounded-[12px] border-[2.5px] transition-transform active:scale-95 lg:h-9"
                style={{
                  background: hex,
                  borderColor: active ? chrome.text : 'transparent',
                  boxShadow: active ? `inset 0 0 0 2px ${chrome.panel}` : undefined,
                }}
              />
            )
          })}
        </div>
        <ColorField label="" value={recipe.accent} onChange={setAccent} colors={chrome} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center justify-between gap-2">
          <span className={label} style={{ color: chrome.mutedText }}>
            {t.studioSecondaryAuto}
          </span>
          <Switch
            checked={secondaryAuto}
            onCheckedChange={(on) =>
              dispatch({
                type: 'recipe',
                // Bật: về màu tự suy ra. Tắt: lệch đi 1° — đủ để không còn "tự
                // động" và hiện ô màu, mà mắt không thấy khác.
                patch: {
                  secondary: on
                    ? autoSecondary(recipe.accent)
                    : shiftHue(recipe.accent, AUTO_SECONDARY_HUE_SHIFT + 1),
                },
              })
            }
            onColor={chrome.accentFill}
            offColor={chrome.borderStrong}
            aria-label={t.studioSecondaryAuto}
          />
        </div>
        {!secondaryAuto && (
          <ColorField
            label={t.studioSecondary}
            value={recipe.secondary}
            onChange={(secondary) => dispatch({ type: 'recipe', patch: { secondary } })}
            colors={chrome}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={label} style={{ color: chrome.mutedText }}>
          {t.studioIntensity}
        </span>
        <Slider
          value={recipe.intensity}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(next) =>
            dispatch({ type: 'recipe', patch: { intensity: typeof next === 'number' ? next : next[0] } })
          }
          trackColor={chrome.border}
          rangeColor={chrome.accentFill}
          aria-label={t.studioIntensity}
        />
        <div className="flex justify-between text-[11px] font-bold" style={{ color: chrome.mutedText }}>
          <span>{t.studioIntensityLow}</span>
          <span>{t.studioIntensityHigh}</span>
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-[14px] px-3 py-2.5 text-[12.5px] font-bold"
        style={{ background: chrome.chip, color: blocked ? chrome.danger : chrome.text }}
      >
        {blocked ? (
          <AlertTriangle className="size-4 shrink-0" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0" style={{ color: chrome.income }} />
        )}
        <span>
          <span style={{ color: chrome.mutedText }}>{t.studioReadability}: </span>
          {blocked ? t.studioSaveBlocked : t.studioReadabilityOk}
        </span>
      </div>
    </div>
  )
}
