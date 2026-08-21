import { useProfilePreferenceSync } from '../hooks/useProfilePreferenceSync'

/**
 * Runs the profile <-> local preference bridge exactly once per session.
 *
 * Mounted above the router on purpose. The bridge hydrates local state from the
 * `profiles` row on the way in, and that step is only correct once: while it
 * lived inside the page components, every switch between `/` and `/expenses`
 * remounted it and re-applied the row on top of a choice the user had just
 * made — a theme picked seconds earlier snapped back to the stored one, so the
 * two modules could sit on different themes at the same time.
 *
 * Renders nothing; it is mounted for its effects.
 */
export function PreferenceSync() {
  useProfilePreferenceSync()
  return null
}
