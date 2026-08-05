import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { deriveTheme } from './deriveTheme'
import { useCustomThemes, type SaveThemeInput } from './hooks/useCustomThemes'
import type { CustomThemeRecord } from './recipe/types'
import { getThemeDefinition } from './themes'
import {
  customThemeId as toCustomThemeId,
  isThemeKey,
  parseCustomThemeId,
  type DerivedTheme,
  type ThemeDefinition,
  type ThemeId,
  type ThemeKey,
} from './types'
import { parseCustomTheme } from './utils/parseCustomTheme'

/** Unchanged meaning: the built-in preset. No migration needed. */
const PRESET_KEY = 'weeklyScheduler.theme'
/** Which custom theme is active, if any. */
const CUSTOM_ID_KEY = 'weeklyScheduler.customThemeId'
/** Enough of the active custom theme to paint the first frame before the fetch. */
const CUSTOM_SNAPSHOT_KEY = 'weeklyScheduler.customTheme'

function readStoredPreset(): ThemeKey {
  if (typeof window === 'undefined') return 'lavender'
  const stored = window.localStorage.getItem(PRESET_KEY)
  return stored && isThemeKey(stored) ? stored : 'lavender'
}

function readStoredCustomId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CUSTOM_ID_KEY)
}

/**
 * The first-paint snapshot.
 *
 * Without it, a user on a custom theme sees their preset for however long the
 * themes query takes and then a full repaint. It goes through
 * `parseCustomTheme` like everything else, so a snapshot written by an older
 * build simply fails validation and degrades to "preset for one frame" instead
 * of rendering a half-valid theme.
 */
function readSnapshot(): CustomThemeRecord | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(CUSTOM_SNAPSHOT_KEY)
  if (!raw) return null
  try {
    return parseCustomTheme(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeSnapshot(record: CustomThemeRecord | null): void {
  if (!record) {
    window.localStorage.removeItem(CUSTOM_SNAPSHOT_KEY)
    return
  }
  const { id, name, icon, recipe, overrides, art } = record
  window.localStorage.setItem(
    CUSTOM_SNAPSHOT_KEY,
    JSON.stringify({ id, name, icon, recipe, overrides, art }),
  )
}

interface ThemeContextValue {
  /** What is selected — a preset key or `custom:<uuid>`. */
  themeId: ThemeId
  /** The preset to fall back to. Kept even while a custom theme is active. */
  presetKey: ThemeKey
  setThemeId: (id: ThemeId) => void
  /** What the app renders, preview included. */
  theme: DerivedTheme
  /**
   * What is actually saved, ignoring any live preview.
   *
   * The theme studio styles its own chrome from this. While the user drags a
   * palette the draft can be briefly unreadable, and a panel that restyles
   * itself into illegibility is a panel you cannot use to fix the problem.
   */
  savedTheme: DerivedTheme
  setPreviewDef: (def: ThemeDefinition | null) => void
  isPreviewing: boolean
  customThemes: CustomThemeRecord[]
  isCustomThemesLoading: boolean
  saveCustomTheme: (draft: SaveThemeInput) => Promise<CustomThemeRecord | null>
  removeCustomTheme: (id: string) => Promise<void>
  newCustomThemeId: () => string
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [presetKey, setPresetKey] = useState<ThemeKey>(readStoredPreset)
  const [customId, setCustomId] = useState<string | null>(readStoredCustomId)
  const [previewDef, setPreviewDef] = useState<ThemeDefinition | null>(null)
  // Read once and never updated. The snapshot exists solely to paint the frames
  // before the themes query resolves; from then on `activeRecord` takes
  // precedence below, so re-reading it would change nothing that renders.
  const [snapshot] = useState<CustomThemeRecord | null>(readSnapshot)

  const { themes, isLoading, isReady, saveTheme, removeTheme, newThemeId } = useCustomThemes()

  const activeRecord = useMemo(() => {
    if (!customId) return null
    return themes.find((theme) => theme.id === customId) ?? null
  }, [customId, themes])

  /**
   * Preference order: the fetched record, then the snapshot for the same id.
   *
   * The "theme was deleted elsewhere" case is *derived*, not synced — once
   * `isReady` says the list is authoritative and the id isn't in it, this returns
   * null and everything downstream falls back to the preset. Doing it here rather
   * than by resetting `customId` in an effect avoids a cascading render, and it
   * makes the `isReady` gate structurally load-bearing: during the persister's
   * rehydration the snapshot still wins, so a cold start cannot mistake "not
   * fetched yet" for "deleted".
   */
  const activeDefinition = useMemo(() => {
    if (!customId) return null
    if (activeRecord) return activeRecord.definition
    if (isReady) return null
    return snapshot?.id === customId ? snapshot.definition : null
  }, [activeRecord, customId, isReady, snapshot])

  const themeId: ThemeId = activeDefinition && customId ? toCustomThemeId(customId) : presetKey

  const savedDefinition = activeDefinition ?? getThemeDefinition(presetKey)
  const savedTheme = useMemo(() => deriveTheme(savedDefinition), [savedDefinition])
  const previewTheme = useMemo(
    () => (previewDef ? deriveTheme(previewDef) : null),
    [previewDef],
  )
  const theme = previewTheme ?? savedTheme

  const setThemeId = useCallback((next: ThemeId) => {
    const uuid = parseCustomThemeId(next)
    if (uuid) {
      setCustomId(uuid)
      window.localStorage.setItem(CUSTOM_ID_KEY, uuid)
      return
    }
    if (!isThemeKey(next)) return
    setPresetKey(next)
    setCustomId(null)
    window.localStorage.setItem(PRESET_KEY, next)
    window.localStorage.removeItem(CUSTOM_ID_KEY)
    writeSnapshot(null)
  }, [])

  /**
   * Clears the stored pointer to a theme that no longer exists — deleted on
   * another device, or taken out by the cascade behind the account.
   *
   * Only touches localStorage; the rendered fallback is already handled by
   * `activeDefinition`. Gated on `isReady`, which folds in both
   * `useIsRestoring()` and the query's success — running it mid-rehydration would
   * wipe the pointer on every cold start.
   */
  useEffect(() => {
    if (!isReady || !customId) return
    if (themes.some((t) => t.id === customId)) return
    window.localStorage.removeItem(CUSTOM_ID_KEY)
    writeSnapshot(null)
  }, [isReady, customId, themes])

  // Keep the first-paint snapshot in step with the authoritative record. Pure
  // write to an external store — nothing in React reads it after mount.
  useEffect(() => {
    if (!activeRecord) return
    writeSnapshot(activeRecord)
  }, [activeRecord])

  const removeCustomTheme = useCallback(
    async (id: string) => {
      // Deselect first: the optimistic cache write below removes the row, and a
      // selection still pointing at it would render the snapshot of a theme that
      // is being deleted.
      if (customId === id) {
        setCustomId(null)
        window.localStorage.removeItem(CUSTOM_ID_KEY)
        writeSnapshot(null)
      }
      await removeTheme(id)
    },
    [customId, removeTheme],
  )

  const value = useMemo(
    () => ({
      themeId,
      presetKey,
      setThemeId,
      theme,
      savedTheme,
      setPreviewDef,
      isPreviewing: previewDef !== null,
      customThemes: themes,
      isCustomThemesLoading: isLoading,
      saveCustomTheme: saveTheme,
      removeCustomTheme,
      newCustomThemeId: newThemeId,
    }),
    [
      themeId,
      presetKey,
      setThemeId,
      theme,
      savedTheme,
      previewDef,
      themes,
      isLoading,
      saveTheme,
      removeCustomTheme,
      newThemeId,
    ],
  )

  // Keeps the iOS/Android chrome (status bar, task switcher card) tinted to
  // match whichever theme is active, instead of the static color in index.html.
  const metaRef = useRef<HTMLMetaElement | null>(null)
  useEffect(() => {
    let meta = metaRef.current
    if (!meta) {
      meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'theme-color'
        document.head.appendChild(meta)
      }
      metaRef.current = meta
    }
    // The studio pushes a new preview on every slider tick; without this check
    // that would write to `document.head` at pointer-move rate.
    if (meta.content !== theme.accent) meta.content = theme.accent
  }, [theme.accent])

  // Scrollbars are painted by the browser, outside React's tree and outside the
  // app shell's subtree — portalled dialogs scroll too — so their colours ride
  // on `:root` custom properties that `index.css` reads.
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--sched-scroll-thumb', theme.scrollThumb)
    root.setProperty('--sched-scroll-thumb-hover', theme.scrollThumbHover)
  }, [theme.scrollThumb, theme.scrollThumbHover])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
