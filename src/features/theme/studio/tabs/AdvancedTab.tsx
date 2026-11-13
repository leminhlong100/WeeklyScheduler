import { useEffect, useRef } from 'react'
import { Plus, RotateCcw, X } from 'lucide-react'

import { ColorField } from '@/components/form/ColorField'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Slider } from '@/components/ui/slider'
import { contrastRatio, hexToOklch, isHex, rgba } from '@/lib/utils/color'
import { ContrastBadge } from '../../components/ContrastBadge'
import { defaultDecorColors, sidebarDepthV2 } from '../../recipe/buildTheme'
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

const MAX_DECOR_COLORS = 4

interface AdvancedTabProps extends StudioTabProps {
  /** Token to scroll to and highlight, set by the readability warnings. */
  focusToken: keyof ThemeTokens | null
}

function parseAlpha(value: string): number | null {
  const match = /rgba?\([^)]*[,/]\s*([\d.]+)\s*\)/.exec(value)
  if (!match) return null
  const alpha = Number(match[1])
  return Number.isFinite(alpha) ? alpha : null
}

const sectionTitle = 'text-[12px] font-extrabold'

export function AdvancedTab({ draft, chrome, t, focusToken }: AdvancedTabProps) {
  const { state, dispatch, definition, derived } = draft
  const { recipe } = state
  const dark = recipe.mode === 'dark'
  const panelHex = resolveTokenColors(definition.panel, dark ? '#12132a' : '#ffffff')[0]
  const hasOverrides = Object.keys(state.overrides).length > 0

  const rows = useRef(new Map<keyof ThemeTokens, HTMLDivElement>())
  useEffect(() => {
    if (focusToken) rows.current.get(focusToken)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusToken])
  const rowRef = (token: keyof ThemeTokens) => (el: HTMLDivElement | null) => {
    if (el) rows.current.set(token, el)
    else rows.current.delete(token)
  }

  // --- decor colours -------------------------------------------------------
  const setDecorColor = (index: number, hex: string) => {
    const decorColors = recipe.decorColors.slice()
    decorColors[index] = hex
    dispatch({ type: 'recipe', patch: { decorColors } })
  }
  const addDecorColor = () => {
    if (recipe.decorColors.length >= MAX_DECOR_COLORS) return
    const suggestions = defaultDecorColors(recipe.accent, recipe.secondary, recipe.highlight, dark)
    dispatch({
      type: 'recipe',
      patch: {
        decorColors: [...recipe.decorColors, suggestions[recipe.decorColors.length] ?? recipe.accent],
      },
    })
  }

  // Theme lưu trước khi có công thức v2: chuyển sang v2 ở đúng độ sáng đang thấy,
  // để bấm nút không làm thanh bên đổi màu — chỉ mở thêm nửa "nhạt" của thanh trượt.
  const upgradeSidebar = () => {
    const mid = definition.sideGrad.match(/#[0-9a-fA-F]{6}\b/g)?.[1]
    const depth = mid ? sidebarDepthV2(dark, hexToOklch(mid).l) : 0.5
    dispatch({ type: 'recipe', patch: { v: 2, sidebarDepth: depth } })
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4">
        <h3 className={sectionTitle} style={{ color: chrome.text }}>
          {t.studioMoreOptions}
        </h3>

        {!dark && (
          <div className="flex flex-col gap-1.5">
            <span className={sectionTitle} style={{ color: chrome.mutedText }}>
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
              activeColor={chrome.accentFill}
              activeTextColor={chrome.onAccent}
              textColor={chrome.mutedText}
              aria-label={t.studioPaper}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className={sectionTitle} style={{ color: chrome.mutedText }}>
            {t.studioSidebarDepth}
          </span>
          <Slider
            value={recipe.sidebarDepth}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(next) =>
              dispatch({ type: 'recipe', patch: { sidebarDepth: typeof next === 'number' ? next : next[0] } })
            }
            trackColor={chrome.border}
            rangeColor={chrome.accentFill}
            aria-label={t.studioSidebarDepth}
          />
          <div className="flex justify-between text-[11px] font-bold" style={{ color: chrome.mutedText }}>
            <span>{t.studioSidebarLight}</span>
            <span>{t.studioSidebarDeep}</span>
          </div>
          {recipe.v !== 2 && (
            <button
              type="button"
              onClick={upgradeSidebar}
              className="self-start text-[12px] font-extrabold underline"
              style={{ color: chrome.accentText }}
            >
              {t.studioSidebarUpgrade}
            </button>
          )}
        </div>

        {dark && (
          <div className="flex flex-col gap-1.5">
            <span className={sectionTitle} style={{ color: chrome.mutedText }}>
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
              activeColor={chrome.accentFill}
              activeTextColor={chrome.onAccent}
              textColor={chrome.mutedText}
              aria-label={t.studioLineTint}
            />
          </div>
        )}

        <ColorField
          label={t.studioHighlight}
          value={recipe.highlight}
          onChange={(highlight) => dispatch({ type: 'recipe', patch: { highlight } })}
          colors={chrome}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className={sectionTitle} style={{ color: chrome.mutedText }}>
              {t.studioDecorColors}
            </span>
            {recipe.decorColors.length < MAX_DECOR_COLORS && (
              <button
                type="button"
                onClick={addDecorColor}
                className="grid size-9 place-items-center rounded-lg"
                style={{ color: chrome.accentText }}
                aria-label={t.studioDecorColors}
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>
          {recipe.decorColors.map((hex, index) => (
            <div key={index} className="flex items-end gap-1.5">
              <ColorField
                label=""
                value={hex}
                onChange={(next) => setDecorColor(index, next)}
                colors={chrome}
                className="flex-1"
              />
              {recipe.decorColors.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: 'recipe',
                      patch: { decorColors: recipe.decorColors.filter((_, i) => i !== index) },
                    })
                  }
                  aria-label={t.studioRemove}
                  title={t.studioRemove}
                  className="grid size-9 place-items-center rounded-lg max-md:size-11"
                  style={{ color: chrome.mutedText }}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className={sectionTitle} style={{ color: chrome.text }}>
          {t.studioTokensTitle}
        </h3>
        <p className="text-[12px] font-semibold leading-snug" style={{ color: chrome.mutedText }}>
          {t.studioAdvancedNote}
        </p>

        {hasOverrides && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'clearOverrides' })}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] text-[12px] font-extrabold"
            style={{ borderColor: chrome.border, color: chrome.text }}
          >
            <RotateCcw className="size-3.5" />
            {t.studioResetAll}
          </button>
        )}

        {GROUPS.map((group) => (
          <details
            key={group.titleKey}
            open={group.tokens.includes(focusToken as keyof ThemeTokens) || undefined}
            className="rounded-[14px] border-[1.5px] p-2.5"
            style={{ borderColor: chrome.border }}
          >
            <summary
              className="flex min-h-9 cursor-pointer items-center text-[12px] font-extrabold select-none"
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
                      ref={rowRef(token)}
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
                            style={{ color: chrome.mutedText }}
                          >
                            {alpha.toFixed(3)}
                          </span>
                          {overridden && (
                            <button
                              type="button"
                              onClick={() => dispatch({ type: 'clearOverride', token })}
                              aria-label={t.studioResetToken}
                              title={t.studioResetToken}
                              className="grid size-8 place-items-center rounded-md"
                              style={{ color: chrome.mutedText }}
                            >
                              <RotateCcw className="size-3.5" />
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
                          const base = recipe.lineTint === 'accent' ? recipe.accent : '#ffffff'
                          dispatch({ type: 'override', patch: { [token]: rgba(base, value) } })
                        }}
                        trackColor={chrome.borderStrong}
                        rangeColor={chrome.accentFill}
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
                      ref={rowRef(token)}
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
                            className="grid size-8 place-items-center rounded-md"
                            style={{ color: chrome.mutedText }}
                          >
                            <RotateCcw className="size-3.5" />
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
                        className="h-8 rounded-[8px] border-[1.5px] px-1.5 font-mono text-[11px] outline-none max-md:h-11 max-md:text-[16px]"
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
                    ref={rowRef(token)}
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
                        // Chỉ chữ chính: chữ phụ được app tự kéo lên 4.5:1
                        // (`mutedText`), con số của token gốc chỉ gây hiểu lầm.
                        token === 'text' ? (
                          <ContrastBadge
                            ratio={contrastRatio(current, panelHex)}
                            threshold={CONTRAST_LIMITS.textFloor}
                          />
                        ) : undefined
                      }
                    />
                    {overridden && (
                      <span
                        className="mt-0.5 block font-mono text-[10px] font-bold"
                        style={{ color: chrome.mutedText }}
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
      </section>
    </div>
  )
}
