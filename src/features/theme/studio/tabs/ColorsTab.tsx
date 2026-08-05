import { Shuffle } from 'lucide-react'

import { ColorField } from '@/components/form/ColorField'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { contrastRatio, oklchToHex, shiftHue } from '@/lib/utils/color'
import { ContrastBadge } from '../../components/ContrastBadge'
import { CONTRAST_LIMITS, resolveTokenColors } from '../../recipe/validate'
import type { ThemeTokens } from '../../types'
import type { StudioTabProps } from '../types'

/** Offset that turns one accent into a plausible gradient partner. */
const AUTO_SECONDARY_HUE_SHIFT = 65

/** The twenty tokens, in the order the strip shows them. */
const TOKEN_STRIP: (keyof ThemeTokens)[] = [
  'accent',
  'grad',
  'appBg',
  'mainBg',
  'panel',
  'modalBg',
  'inputBg',
  'chip',
  'text',
  'muted',
  'border',
  'borderStrong',
  'gridLine',
  'nowLine',
  'sideGrad',
]

interface ColorsTabProps extends StudioTabProps {
  /** Jumps to Advanced with a token focused. */
  onEditToken: (token: keyof ThemeTokens) => void
}

function randomHex(): string {
  // Random in OKLCH, not in RGB: uniform RGB noise is mostly muddy dark colours,
  // while fixing lightness and chroma to the range the presets actually occupy
  // gives something usable on the first roll.
  const l = 0.55 + Math.random() * 0.2
  const c = 0.09 + Math.random() * 0.11
  return oklchToHex({ l, c, h: Math.random() * 360 })
}

export function ColorsTab({ draft, chrome, t, onEditToken }: ColorsTabProps) {
  const { state, dispatch, definition } = draft
  const { recipe } = state
  const dark = recipe.mode === 'dark'

  const panelHex = resolveTokenColors(definition.panel, dark ? '#12132a' : '#ffffff')[0]

  const randomize = () => {
    const accent = randomHex()
    dispatch({
      type: 'recipe',
      patch: {
        accent,
        secondary: shiftHue(accent, AUTO_SECONDARY_HUE_SHIFT),
        highlight: shiftHue(accent, -120),
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={randomize}
        className="flex h-8 items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] text-[12px] font-extrabold"
        style={{ borderColor: chrome.border, background: chrome.chip, color: chrome.text }}
      >
        <Shuffle className="size-3.5" />
        {t.studioRandomize}
      </button>

      <ColorField
        label={t.studioAccent}
        value={recipe.accent}
        onChange={(accent) => dispatch({ type: 'recipe', patch: { accent } })}
        colors={chrome}
      />

      <div className="flex flex-col gap-1">
        <ColorField
          label={t.studioSecondary}
          value={recipe.secondary}
          onChange={(secondary) => dispatch({ type: 'recipe', patch: { secondary } })}
          colors={chrome}
        />
        {/* Not derivable from the accent — the shipped presets disagree on even the
            sign of the offset (lavender +51 degrees, cottoncandy -51) — so this is
            an input with a suggestion, not a computed value. */}
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: 'recipe',
              patch: { secondary: shiftHue(recipe.accent, AUTO_SECONDARY_HUE_SHIFT) },
            })
          }
          className="self-start text-[11px] font-extrabold underline"
          style={{ color: chrome.accent }}
        >
          {t.studioSecondaryAuto}
        </button>
      </div>

      <ColorField
        label={t.studioHighlight}
        value={recipe.highlight}
        onChange={(highlight) => dispatch({ type: 'recipe', patch: { highlight } })}
        colors={chrome}
      />

      {!dark && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
            {t.studioPaper}
          </span>
          <SegmentedControl
            value={recipe.paper}
            onChange={(paper) => dispatch({ type: 'recipe', patch: { paper } })}
            options={[
              { value: 'pure', label: t.studioPaperPure },
              { value: 'tinted', label: t.studioPaperTinted },
              { value: 'warm', label: t.studioPaperWarm },
            ]}
            trackColor={chrome.chip}
            activeColor={chrome.accent}
            activeTextColor="#ffffff"
            textColor={chrome.muted}
            aria-label={t.studioPaper}
          />
        </div>
      )}

      <SliderRow
        label={t.studioIntensity}
        value={recipe.intensity}
        onChange={(intensity) => dispatch({ type: 'recipe', patch: { intensity } })}
        chrome={chrome}
      />

      <SliderRow
        label={t.studioSidebarDepth}
        value={recipe.sidebarDepth}
        onChange={(sidebarDepth) => dispatch({ type: 'recipe', patch: { sidebarDepth } })}
        chrome={chrome}
      />

      {dark && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
            {t.studioLineTint}
          </span>
          {/* Dark-only: light presets paint lines as opaque surfaces where the
              distinction does not exist. */}
          <SegmentedControl
            value={recipe.lineTint ?? 'white'}
            onChange={(lineTint) => dispatch({ type: 'recipe', patch: { lineTint } })}
            options={[
              { value: 'white', label: t.studioLineTintWhite },
              { value: 'accent', label: t.studioLineTintAccent },
            ]}
            trackColor={chrome.chip}
            activeColor={chrome.accent}
            activeTextColor="#ffffff"
            textColor={chrome.muted}
            aria-label={t.studioLineTint}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
            {t.studioTokens}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold" style={{ color: chrome.muted }}>
              {t.studioAccent}
            </span>
            <ContrastBadge
              ratio={contrastRatio(definition.text, panelHex)}
              threshold={CONTRAST_LIMITS.textFloor}
            />
          </div>
        </div>
        <p className="text-[10px] font-semibold leading-snug" style={{ color: chrome.muted }}>
          {t.studioTokensHint}
        </p>
        {/* Answers "what do my seven inputs actually do?" honestly, and doubles as
            the route into per-token editing. */}
        <div className="grid grid-cols-5 gap-1.5">
          {TOKEN_STRIP.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => onEditToken(token)}
              title={token}
              className="flex flex-col items-center gap-1"
            >
              <span
                className="h-7 w-full rounded-[8px] border"
                style={{
                  background: String(definition[token]),
                  borderColor: state.overrides[token] ? chrome.accent : chrome.border,
                  borderWidth: state.overrides[token] ? 2 : 1,
                }}
              />
              <span
                className="w-full truncate text-center text-[8px] font-bold"
                style={{ color: chrome.muted }}
              >
                {token}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  chrome,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  chrome: StudioTabProps['chrome']
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
          {label}
        </span>
        <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: chrome.muted }}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider
        value={value}
        min={0}
        max={1}
        step={0.01}
        onValueChange={(next) => onChange(typeof next === 'number' ? next : next[0])}
        trackColor={chrome.border}
        rangeColor={chrome.accent}
        aria-label={label}
      />
    </div>
  )
}
