import type { Dictionary } from '@/features/i18n/dictionary'
import type { DerivedTheme } from '../types'
import type { StudioDraft } from './useStudioDraft'

export interface StudioTabProps {
  draft: StudioDraft
  /**
   * The *saved* theme, not the draft.
   *
   * The studio's own chrome must not restyle itself from the theme being edited:
   * halfway through picking a palette the draft can be briefly unreadable, and a
   * panel that follows it into illegibility is a panel you can no longer use to
   * fix the problem.
   */
  chrome: DerivedTheme
  t: Dictionary
}
