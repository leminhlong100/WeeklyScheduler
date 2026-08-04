/** Storage bucket holding user-uploaded theme artwork. Created in `0007`. */
export const ART_BUCKET = 'theme-art'

/**
 * Every persisted art URL must start with this.
 *
 * It closes two holes at once. The obvious one is CSS injection — a stored
 * `url()` value is interpolated into a `background` declaration. The less
 * obvious one is privacy: without an origin check, a theme row could point
 * `scene` at an attacker's host and every render would beacon the user's IP and
 * `Referer` there. Restricting to our own bucket makes both impossible.
 *
 * Deliberately *not* applied to in-memory drafts: those hold `blob:` URLs from
 * the local encode step, which are same-origin and never persisted.
 */
export const ART_PREFIX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${ART_BUCKET}/`

/** The five art slots. One object per slot per theme, hence the 20-theme cap. */
export const ART_SLOTS = ['scene', 'side', 'figure1', 'figure2', 'figure3'] as const
export type ArtSlot = (typeof ART_SLOTS)[number]

/**
 * The scene anchors the grid renders behind. A closed set rather than free text
 * because the value lands in the same CSS declaration as the escaped url().
 */
export const SCENE_POSITIONS = [
  'center bottom',
  'center center',
  'center top',
  'left bottom',
  'right bottom',
] as const
export type ScenePosition = (typeof SCENE_POSITIONS)[number]

/** Matches `ThemeArtLayer`'s fallback so the builder shows the real default. */
export const DEFAULT_SCENE_OPACITY = 0.42

/** Figure height in px at desktop scale. */
export const FIGURE_HEIGHT = { min: 80, max: 420, default: 200 } as const

/** Most themes read fine with three; more crowds the single-day mobile column. */
export const MAX_FIGURES = 3

/** Matches the server-side cap in `custom_themes`' limit trigger. */
export const MAX_CUSTOM_THEMES = 20
