import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'

import { ImageDropField } from '@/components/form/ImageDropField'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  ThemeImageError,
  prepareThemeImage,
  type ThemeImageKind,
} from '@/lib/utils/themeImage'
import { removeThemeArt, uploadThemeArt } from '../../api/customThemesApi'
import {
  DEFAULT_SCENE_OPACITY,
  FIGURE_HEIGHT,
  MAX_FIGURES,
  SCENE_POSITIONS,
  type ArtSlot,
  type ScenePosition,
} from '../../art/constants'
import { resolveTokenColors } from '../../recipe/validate'
import type { StudioTabProps } from '../types'

interface ArtTabProps extends StudioTabProps {
  userId: string
  /** Reported upward so Save can be blocked while bytes are in flight. */
  onBusyChange: (busy: boolean) => void
}

type SlotState = { busy: boolean; error?: string }

const POSITION_LABEL_KEYS: Record<ScenePosition, keyof StudioTabProps['t']> = {
  'center bottom': 'studioPosCenterBottom',
  'center center': 'studioPosCenterCenter',
  'center top': 'studioPosCenterTop',
  'left bottom': 'studioPosLeftBottom',
  'right bottom': 'studioPosRightBottom',
}

export function ArtTab({ draft, chrome, t, userId, onBusyChange }: ArtTabProps) {
  const { state, dispatch, definition } = draft
  const art = state.art
  const [slots, setSlots] = useState<Record<string, SlotState>>({})

  // Blob URLs handed to the preview before the upload finishes. Revoked when the
  // remote URL replaces them, and on unmount so closing mid-upload doesn't leak.
  const localUrls = useRef<Set<string>>(new Set())
  useEffect(
    () => () => {
      for (const url of localUrls.current) URL.revokeObjectURL(url)
      localUrls.current.clear()
    },
    [],
  )

  const busy = Object.values(slots).some((slot) => slot.busy)
  useEffect(() => {
    onBusyChange(busy)
  }, [busy, onBusyChange])

  const mainBgHex = resolveTokenColors(
    definition.mainBg,
    state.recipe.mode === 'dark' ? '#12132a' : '#ffffff',
  )[0]

  const setSlot = (slot: string, next: SlotState) =>
    setSlots((prev) => ({ ...prev, [slot]: next }))

  /**
   * Encode locally, show it immediately, then upload.
   *
   * The local `blob:` goes into the draft first so the user judges the image at
   * full size right away instead of watching a spinner; the remote URL swaps in
   * underneath once it lands. `ART_PREFIX` is not enforced on drafts precisely so
   * this can work — the check lives at the persistence boundary, and `cssUrl()`
   * still escapes whatever reaches the sink.
   */
  const pick = async (slot: ArtSlot, kind: ThemeImageKind, file: File, figureIndex?: number) => {
    setSlot(slot, { busy: true })
    let localUrl: string | null = null
    try {
      const prepared = await prepareThemeImage(file, kind, mainBgHex)
      localUrl = URL.createObjectURL(prepared.blob)
      localUrls.current.add(localUrl)

      const previous =
        kind === 'scene' ? art?.scene : kind === 'sideScene' ? art?.sideScene : undefined

      if (kind === 'figure') {
        if (figureIndex === undefined) {
          dispatch({
            type: 'addFigure',
            figure: { src: localUrl, x: '50%', h: FIGURE_HEIGHT.default },
          })
        } else {
          dispatch({ type: 'figure', index: figureIndex, patch: { src: localUrl } })
        }
      } else if (kind === 'scene') {
        dispatch({
          type: 'art',
          patch: {
            scene: localUrl,
            sceneDarkestCell: prepared.darkestCell,
            sceneLightestCell: prepared.lightestCell,
          },
        })
      } else {
        dispatch({ type: 'art', patch: { sideScene: localUrl } })
      }

      const remoteUrl = await uploadThemeArt({
        userId,
        themeId: state.id,
        slot,
        blob: prepared.blob,
        mime: prepared.mime,
      })

      const index = figureIndex ?? (art?.figures?.length ?? 0)
      if (kind === 'figure') dispatch({ type: 'figure', index, patch: { src: remoteUrl } })
      else if (kind === 'scene') dispatch({ type: 'art', patch: { scene: remoteUrl } })
      else dispatch({ type: 'art', patch: { sideScene: remoteUrl } })

      if (localUrl) {
        URL.revokeObjectURL(localUrl)
        localUrls.current.delete(localUrl)
      }
      // Best effort: the once-per-session orphan sweep reconciles anything left.
      if (previous) void removeThemeArt([previous]).catch(() => {})

      setSlot(slot, { busy: false, error: prepared.warning })
    } catch (error) {
      if (localUrl) {
        URL.revokeObjectURL(localUrl)
        localUrls.current.delete(localUrl)
      }
      const key = error instanceof ThemeImageError ? error.key : 'themeImageFailed'
      const params = error instanceof ThemeImageError ? error.params : undefined
      const message = t[key as keyof typeof t]
      setSlot(slot, {
        busy: false,
        error:
          typeof message === 'string' && params?.n !== undefined
            ? message.replace('{n}', String(params.n))
            : typeof message === 'string'
              ? message
              : key,
      })
    }
  }

  const sceneOpacity = art?.sceneOpacity ?? DEFAULT_SCENE_OPACITY
  const sceneIssue = draft.issues.find((issue) => issue.code === 'themeIssueScene')
  const figures = art?.figures ?? []

  return (
    <div className="flex flex-col gap-4">
      <ImageDropField
        label={t.studioScene}
        hint={t.studioSceneHint}
        value={art?.scene ?? null}
        onPick={(file) => void pick('scene', 'scene', file)}
        onClear={() =>
          dispatch({
            type: 'art',
            patch: { scene: undefined, sceneDarkestCell: undefined, sceneLightestCell: undefined },
          })
        }
        colors={chrome}
        busy={slots.scene?.busy}
        error={slots.scene?.error}
        clearLabel={t.studioRemove}
        aspect="16 / 9"
      />

      {art?.scene && (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
                {t.studioSceneOpacity}
              </span>
              <span
                className="font-mono text-[10px] font-bold tabular-nums"
                style={{ color: chrome.muted }}
              >
                {Math.round(sceneOpacity * 100)}%
              </span>
            </div>
            <Slider
              value={sceneOpacity}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(next) =>
                dispatch({
                  type: 'art',
                  patch: { sceneOpacity: typeof next === 'number' ? next : next[0] },
                })
              }
              trackColor={chrome.border}
              rangeColor={chrome.accent}
              aria-label={t.studioSceneOpacity}
            />
            {sceneIssue && (
              // A fix, not just a complaint: the number offered is the highest
              // opacity that still clears the text threshold.
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[10px] font-bold" style={{ color: '#f0a92e' }}>
                  {t.themeIssueScene} ({sceneIssue.ratio.toFixed(1)}:1)
                </span>
                {sceneIssue.suggestedOpacity !== undefined && (
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: 'art',
                        patch: { sceneOpacity: sceneIssue.suggestedOpacity },
                      })
                    }
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                    style={{ background: chrome.chip, color: chrome.text }}
                  >
                    {t.studioUseOpacity.replace(
                      '{n}',
                      String(Math.round(sceneIssue.suggestedOpacity * 100)),
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
              {t.studioScenePosition}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {SCENE_POSITIONS.map((position) => {
                const active = (art.scenePosition ?? 'center bottom') === position
                return (
                  <button
                    key={position}
                    type="button"
                    onClick={() => dispatch({ type: 'art', patch: { scenePosition: position } })}
                    className="rounded-[10px] border-[1.5px] px-1.5 py-1.5 text-[10px] font-extrabold"
                    style={{
                      borderColor: active ? chrome.accent : chrome.border,
                      background: active ? chrome.chip : 'transparent',
                      color: chrome.text,
                    }}
                  >
                    {t[POSITION_LABEL_KEYS[position]]}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      <ImageDropField
        label={t.studioSideScene}
        hint={t.studioSideSceneHint}
        value={art?.sideScene ?? null}
        onPick={(file) => void pick('side', 'sideScene', file)}
        onClear={() => dispatch({ type: 'art', patch: { sideScene: undefined } })}
        colors={chrome}
        busy={slots.side?.busy}
        error={slots.side?.error}
        clearLabel={t.studioRemove}
        aspect="9 / 16"
        className="max-w-[160px]"
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
            {t.studioFigures}
          </span>
          <span className="font-mono text-[10px] font-bold" style={{ color: chrome.muted }}>
            {figures.length}/{MAX_FIGURES}
          </span>
        </div>
        <p className="text-[10px] font-semibold leading-snug" style={{ color: chrome.muted }}>
          {t.studioFiguresHint}
        </p>

        {figures.map((figure, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-[14px] border-[1.5px] p-2.5"
            style={{ borderColor: chrome.border, background: chrome.chip }}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-10 shrink-0 rounded-[10px] border"
                style={{
                  borderColor: chrome.border,
                  background: `#ffffff url("${encodeURI(figure.src)}") center/contain no-repeat`,
                }}
              />
              <span className="flex-1 text-[11px] font-extrabold" style={{ color: chrome.text }}>
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: 'removeFigure', index })}
                aria-label={t.studioRemove}
                title={t.studioRemove}
                className="grid size-6 place-items-center rounded-md"
                style={{ color: chrome.muted }}
              >
                <X className="size-3.5" />
              </button>
            </div>

            <FigureSlider
              label={t.studioFigureX}
              value={Number.parseFloat(figure.x) || 50}
              min={0}
              max={100}
              suffix="%"
              chrome={chrome}
              onChange={(value) =>
                dispatch({ type: 'figure', index, patch: { x: `${Math.round(value)}%` } })
              }
            />
            <FigureSlider
              label={t.studioFigureH}
              value={figure.h}
              min={FIGURE_HEIGHT.min}
              max={FIGURE_HEIGHT.max}
              suffix="px"
              chrome={chrome}
              onChange={(h) => dispatch({ type: 'figure', index, patch: { h: Math.round(h) } })}
            />
            <FigureSlider
              label={t.studioFigureOpacity}
              value={(figure.opacity ?? 1) * 100}
              min={20}
              max={100}
              suffix="%"
              chrome={chrome}
              onChange={(value) =>
                dispatch({
                  type: 'figure',
                  index,
                  patch: { opacity: Math.round(value) / 100 },
                })
              }
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold" style={{ color: chrome.muted }}>
                {t.studioFigureFlip}
              </span>
              <Switch
                checked={!!figure.flip}
                onCheckedChange={(flip) => dispatch({ type: 'figure', index, patch: { flip } })}
                onColor={chrome.accent}
                offColor={chrome.border}
                aria-label={t.studioFigureFlip}
              />
            </div>
          </div>
        ))}

        {figures.length < MAX_FIGURES && (
          <FigurePicker
            label={t.studioAddFigure}
            chrome={chrome}
            // The aggregate flag, not this slot's: the moment a local blob enters
            // the draft `figures.length` grows, so a per-slot key would change
            // under the upload and re-enable the button mid-flight.
            busy={busy}
            error={slots[`figure${figures.length + 1}`]?.error}
            onPick={(file) =>
              void pick(`figure${figures.length + 1}` as ArtSlot, 'figure', file)
            }
          />
        )}
      </div>
    </div>
  )
}

function FigureSlider({
  label,
  value,
  min,
  max,
  suffix,
  chrome,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  chrome: StudioTabProps['chrome']
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-extrabold" style={{ color: chrome.muted }}>
          {label}
        </span>
        <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: chrome.muted }}>
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={1}
        onValueChange={(next) => onChange(typeof next === 'number' ? next : next[0])}
        trackColor={chrome.borderStrong}
        rangeColor={chrome.accent}
        aria-label={label}
      />
    </div>
  )
}

function FigurePicker({
  label,
  chrome,
  busy,
  error,
  onPick,
}: {
  label: string
  chrome: StudioTabProps['chrome']
  busy?: boolean
  error?: string
  onPick: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex h-9 items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] border-dashed text-[12px] font-extrabold disabled:opacity-50"
        style={{ borderColor: chrome.border, color: chrome.muted }}
      >
        <Plus className="size-3.5" />
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onPick(file)
          event.target.value = ''
        }}
      />
      {error && <p className="text-[10px] font-bold text-[#f0a92e]">{error}</p>}
    </div>
  )
}
