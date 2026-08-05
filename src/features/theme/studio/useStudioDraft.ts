import { useEffect, useMemo, useReducer } from 'react'
import { buildThemeFromRecipe, defaultDecorColors } from '../recipe/buildTheme'
import { recipeFromDefinition } from '../recipe/recipeFromDefinition'
import type { CustomThemeRecord, ThemeRecipe, TokenOverrides } from '../recipe/types'
import { validateTheme, type ThemeIssue } from '../recipe/validate'
import { getThemeDefinition } from '../themes'
import { customThemeId, type ThemeArt, type ThemeArtFigure, type ThemeDefinition, type ThemeKey, type ThemeTokens } from '../types'
import { toLocalizedText } from '../utils/localizedText'

/**
 * Trailing debounce before the draft is pushed as a live preview.
 *
 * `buildThemeFromRecipe` is cheap (~forty OKLCH conversions), but a new `theme`
 * identity re-renders every `useTheme()` consumer — which is most of the app.
 * At pointer-move rate that is the difference between a slider that glides and
 * one that stutters.
 */
const PREVIEW_DEBOUNCE_MS = 60

export type StudioTab = 'basics' | 'colors' | 'decor' | 'art' | 'advanced'

export interface StudioState {
  /**
   * Always present, even before the first save.
   *
   * Artwork uploads to `<userId>/<themeId>/…`, and that happens while the user is
   * still editing — long before a row exists. So the id is generated up front and
   * `isNew` carries the "has it been inserted yet" question separately.
   */
  id: string
  isNew: boolean
  name: string
  icon: string
  recipe: ThemeRecipe
  overrides: TokenOverrides
  art: ThemeArt | null
  /** Whether anything has changed since the last save or reseed. */
  dirty: boolean
}

export type StudioAction =
  | { type: 'reseed'; preset: ThemeKey }
  | { type: 'identity'; name?: string; icon?: string }
  | { type: 'recipe'; patch: Partial<ThemeRecipe> }
  | { type: 'override'; patch: TokenOverrides }
  | { type: 'clearOverride'; token: keyof ThemeTokens }
  | { type: 'clearOverrides' }
  | { type: 'art'; patch: Partial<ThemeArt> }
  | { type: 'clearArt' }
  | { type: 'addFigure'; figure: ThemeArtFigure }
  | { type: 'figure'; index: number; patch: Partial<ThemeArtFigure> }
  | { type: 'removeFigure'; index: number }
  | { type: 'saved' }

function recipeForPreset(preset: ThemeKey): ThemeRecipe {
  return recipeFromDefinition(getThemeDefinition(preset), preset)
}

/** Merges an art patch, collapsing an emptied art block back to null. */
function mergeArt(current: ThemeArt | null, patch: Partial<ThemeArt>): ThemeArt | null {
  const next: ThemeArt = { ...current, ...patch }
  for (const key of Object.keys(next) as (keyof ThemeArt)[]) {
    if (next[key] === undefined) delete next[key]
  }
  if (next.figures?.length === 0) delete next.figures
  // An art object with no scene, no side scene and no figures renders nothing;
  // keeping it would persist `{}` and make `theme.art` truthy for no reason.
  const hasContent = !!next.scene || !!next.sideScene || !!next.figures?.length
  return hasContent ? next : null
}

function reducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'reseed': {
      const recipe = recipeForPreset(action.preset)
      // Overrides are dropped: they were deltas against the *old* preset's derived
      // values, so carrying them over would paint the new palette with stale
      // fragments of the previous one. Artwork and identity are the user's own and
      // have nothing to do with which preset seeded the colours, so they stay.
      return { ...state, recipe, overrides: {}, dirty: true }
    }
    case 'identity':
      return {
        ...state,
        name: action.name ?? state.name,
        icon: action.icon ?? state.icon,
        dirty: true,
      }
    case 'recipe': {
      const recipe = { ...state.recipe, ...action.patch }
      // The decor palette is derived from the three colour inputs, so it has to
      // follow them — unless the user has picked their own, which the equality
      // check below detects by comparing against what the *previous* inputs
      // would have produced.
      const wasDefault = sameColors(
        state.recipe.decorColors,
        defaultDecorColors(
          state.recipe.accent,
          state.recipe.secondary,
          state.recipe.highlight,
          state.recipe.mode === 'dark',
        ),
      )
      if (wasDefault) {
        recipe.decorColors = defaultDecorColors(
          recipe.accent,
          recipe.secondary,
          recipe.highlight,
          recipe.mode === 'dark',
        )
      }
      return { ...state, recipe, dirty: true }
    }
    case 'override':
      return { ...state, overrides: { ...state.overrides, ...action.patch }, dirty: true }
    case 'clearOverride': {
      const overrides = { ...state.overrides }
      delete overrides[action.token]
      return { ...state, overrides, dirty: true }
    }
    case 'clearOverrides':
      return { ...state, overrides: {}, dirty: true }
    case 'art':
      return { ...state, art: mergeArt(state.art, action.patch), dirty: true }
    case 'clearArt':
      return { ...state, art: null, dirty: true }
    case 'addFigure':
      return {
        ...state,
        art: mergeArt(state.art, { figures: [...(state.art?.figures ?? []), action.figure] }),
        dirty: true,
      }
    case 'figure': {
      const figures = (state.art?.figures ?? []).map((figure, index) =>
        index === action.index ? { ...figure, ...action.patch } : figure,
      )
      return { ...state, art: mergeArt(state.art, { figures }), dirty: true }
    }
    case 'removeFigure': {
      const figures = (state.art?.figures ?? []).filter((_, index) => index !== action.index)
      return { ...state, art: mergeArt(state.art, { figures }), dirty: true }
    }
    case 'saved':
      return { ...state, isNew: false, dirty: false }
  }
}

function sameColors(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((hex, i) => hex.toLowerCase() === b[i]?.toLowerCase())
}

function initialState(
  record: CustomThemeRecord | null,
  preset: ThemeKey,
  fallbackName: string,
  newId: string,
): StudioState {
  if (record) {
    return {
      id: record.id,
      isNew: false,
      name: record.name,
      icon: record.icon,
      recipe: record.recipe,
      overrides: record.overrides,
      art: record.art,
      dirty: false,
    }
  }
  return {
    id: newId,
    isNew: true,
    name: fallbackName,
    icon: '🎨',
    recipe: recipeForPreset(preset),
    overrides: {},
    art: null,
    dirty: false,
  }
}

export interface StudioDraft {
  state: StudioState
  dispatch: (action: StudioAction) => void
  /** The draft as a renderable theme. Also what gets saved. */
  definition: ThemeDefinition
  /** Tokens as the recipe alone would produce them — the reset target per token. */
  derived: ThemeTokens
  issues: ThemeIssue[]
}

/**
 * Holds the theme being edited and streams it to the live preview.
 *
 * The preview is pushed here rather than by each tab so there is exactly one
 * place that decides when the app repaints, and one place that clears the
 * preview on unmount — a studio that closes while still previewing would leave
 * the app rendering a theme the user never saved.
 */
export function useStudioDraft(args: {
  record: CustomThemeRecord | null
  basePreset: ThemeKey
  fallbackName: string
  newThemeId: () => string
  setPreviewDef: (def: ThemeDefinition | null) => void
}): StudioDraft {
  const { record, basePreset, fallbackName, newThemeId, setPreviewDef } = args
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(record, basePreset, fallbackName, newThemeId()),
  )

  const derived = useMemo(
    () => buildThemeFromRecipe(state.recipe, { key: 'lavender', name: toLocalizedText(''), icon: '' }),
    [state.recipe],
  )

  const definition = useMemo(
    () =>
      buildThemeFromRecipe(
        state.recipe,
        {
          key: customThemeId(state.id),
          name: toLocalizedText(state.name),
          icon: state.icon,
        },
        state.overrides,
        state.art ?? undefined,
      ),
    [state.recipe, state.overrides, state.art, state.id, state.name, state.icon],
  )

  const issues = useMemo(() => validateTheme(definition, state.art), [definition, state.art])

  // `setPreviewDef` is a `useState` setter from ThemeContext, so React guarantees
  // its identity — it can go in the dependencies directly instead of being
  // smuggled past them through a ref.
  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewDef(definition), PREVIEW_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [definition, setPreviewDef])

  // Clearing on unmount is what guarantees a closed studio never leaves an
  // unsaved draft applied to the app.
  useEffect(() => () => setPreviewDef(null), [setPreviewDef])

  return { state, dispatch, definition, derived, issues }
}
