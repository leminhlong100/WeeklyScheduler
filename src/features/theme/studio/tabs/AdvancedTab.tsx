import { RotateCcw } from 'lucide-react'

import { ColorField } from '@/components/form/ColorField'
import { Slider } from '@/components/ui/slider'
import { contrastRatio, isHex, rgba } from '@/lib/utils/color'
import { ContrastBadge } from '../../components/ContrastBadge'
import { CONTRAST_LIMITS, resolveTokenColors } from '../../recipe/validate'
import type { ThemeTokens } from '../../types'
import type { StudioTabProps } from '../types'

/**
 * Token names are shown untranslated on purpose.
 *
 * Anyone in this tab is matching values against a theme definition, where these
 * are the identifiers. "borderStrong" rendered as "viền đậm" would be *less*
 * clear at the moment it matters, and it would cost eighty strings to say so.
 */
const GROUPS: { titleKey: 'studioGroupSurfaces' | 'studioGroupText' | 'studioGroupLines' | 'studioGroupBrand'; tokens: (keyof ThemeTokens)[] }[] = [
  { titleKey: 'studioGroupSurfaces', tokens: ['appBg', 'mainBg', 'panel', 'modalBg', 'inputBg'] },
  { titleKey: 'studioGroupText', tokens: ['text', 'muted'] },
  { titleKey: 'studioGroupLines', tokens: ['border', 'borderStrong', 'chip', 'gridLine'] },
  { titleKey: 'studioGroupBrand', tokens: ['accent', 'grad', 'nowLine', 'sideGrad'] },
]

/** Dark themes express these as alpha over the surface below. */
const ALPHA_TOKENS: (keyof ThemeTokens)[] = ['border', 'borderStrong', 'chip', 'gridLine']

interface AdvancedTabProps extends StudioTabProps {
  /** Token to scroll to and highlight, set by the colour strip. */
  focusToken: keyof ThemeTokens | null
}

function parseAlpha(value: string): number | null {
  const match = /rgba?\([^)]*[,/]\s*([\d.]+)\s*\)/.exec(value)
  if (!match) return null
  const alpha = Number(match[1])
  return Number.isFinite(alpha) ? alpha : null
}

export function AdvancedTab({ draft, chrome, t, focusToken }: AdvancedTabProps) {
  const { state, dispatch, definition, derived } = draft
  const dark = state.recipe.mode === 'dark'
  const panelHex = resolveTokenColors(definition.panel, dark ? '#12132a' : '#ffffff')[0]

  const hasOverrides = Object.keys(state.overrides).length > 0

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] font-semibold leading-snug" style={{ color: chrome.muted }}>
        {t.studioAdvancedNote}
      </p>

      {hasOverrides && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'clearOverrides' })}
          className="flex h-8 items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] text-[12px] font-extrabold"
          style={{ borderColor: chrome.border, color: chrome.text }}
        >
          <RotateCcw className="size-3.5" />
          {t.studioResetAll}
        </button>
      )}

      {GROUPS.map((group) => (
        <details
          key={group.titleKey}
          open={group.tokens.includes(focusToken as keyof ThemeTokens)}
          className="rounded-[14px] border-[1.5px] p-2.5"
          style={{ borderColor: chrome.border }}
        >
          <summary
            className="cursor-pointer text-[11px] font-extrabold select-none"
            style={{ color: chrome.text }}
          >
            {t[group.titleKey]}
          </summary>

          <div className="mt-2.5 flex flex-col gap-3">
            {group.tokens.map((token) => {
              const current = String(definition[token])
              const fallback = String(derived[token])
              const overridden = state.overrides[token] !== undefined
              const isFocused = focusToken === token

              // Dark line tokens are alpha over whatever surface they sit on, which
              // is what makes one value work everywhere. A hex picker here would
              // replace that with an opaque colour and break the adaptiveness, so
              // the control becomes what the value actually is: a strength.
              if (dark && ALPHA_TOKENS.includes(token)) {
                const alpha = parseAlpha(current) ?? 0.1
                return (
                  <div
                    key={token}
                    className="flex flex-col gap-1 rounded-[10px] p-1"
                    style={{ background: isFocused ? chrome.chip : undefined }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold" style={{ color: chrome.text }}>
                        {token}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-mono text-[10px] font-bold tabular-nums"
                          style={{ color: chrome.muted }}
                        >
                          {alpha.toFixed(3)}
                        </span>
                        {overridden && (
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'clearOverride', token })}
                            aria-label={t.studioResetToken}
                            title={t.studioResetToken}
                            className="grid size-5 place-items-center rounded-md"
                            style={{ color: chrome.muted }}
                          >
                            <RotateCcw className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <Slider
                      value={alpha}
                      min={0}
                      max={0.4}
                      step={0.005}
                      onValueChange={(next) => {
                        const value = typeof next === 'number' ? next : next[0]
                        const base =
                          state.recipe.lineTint === 'accent' ? state.recipe.accent : '#ffffff'
                        dispatch({ type: 'override', patch: { [token]: rgba(base, value) } })
                      }}
                      trackColor={chrome.borderStrong}
                      rangeColor={chrome.accent}
                      aria-label={`${token} ${t.studioLineAlpha}`}
                    />
                  </div>
                )
              }

              // Gradients and rgba() cannot be edited by a hex swatch either; show
              // the raw value so at least it is inspectable and correctable.
              if (!isHex(current)) {
                return (
                  <div
                    key={token}
                    className="flex flex-col gap-1 rounded-[10px] p-1"
                    style={{ background: isFocused ? chrome.chip : undefined }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold" style={{ color: chrome.text }}>
                        {token}
                      </span>
                      {overridden && (
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'clearOverride', token })}
                          aria-label={t.studioResetToken}
                          title={t.studioResetToken}
                          className="grid size-5 place-items-center rounded-md"
                          style={{ color: chrome.muted }}
                        >
                          <RotateCcw className="size-3" />
                        </button>
                      )}
                    </div>
                    <span
                      className="h-6 w-full rounded-[8px] border"
                      style={{ background: current, borderColor: chrome.border }}
                    />
                    <input
                      value={current}
                      onChange={(event) =>
                        dispatch({ type: 'override', patch: { [token]: event.target.value } })
                      }
                      spellCheck={false}
                      className="h-7 rounded-[8px] border-[1.5px] px-1.5 font-mono text-[10px] outline-none"
                      style={{
                        background: chrome.inputBg,
                        borderColor: chrome.border,
                        color: chrome.text,
                      }}
                      aria-label={token}
                    />
                  </div>
                )
              }

              return (
                <div
                  key={token}
                  className="rounded-[10px] p-1"
                  style={{ background: isFocused ? chrome.chip : undefined }}
                >
                  <ColorField
                    label={token}
                    value={current}
                    onChange={(hex) => dispatch({ type: 'override', patch: { [token]: hex } })}
                    colors={chrome}
                    onReset={overridden ? () => dispatch({ type: 'clearOverride', token }) : undefined}
                    resetLabel={t.studioResetToken}
                    badge={
                      token === 'text' || token === 'muted' ? (
                        <ContrastBadge
                          ratio={contrastRatio(current, panelHex)}
                          threshold={
                            token === 'text'
                              ? CONTRAST_LIMITS.textFloor
                              : CONTRAST_LIMITS.mutedWarn
                          }
                        />
                      ) : undefined
                    }
                  />
                  {overridden && (
                    <span
                      className="mt-0.5 block font-mono text-[9px] font-bold"
                      style={{ color: chrome.muted }}
                    >
                      {fallback}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}
