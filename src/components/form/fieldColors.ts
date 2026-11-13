/**
 * The palette slice a themed form control needs.
 *
 * Declared here rather than importing `DerivedTheme` so `components/` stays
 * independent of `features/`. A theme object satisfies this structurally, so call
 * sites just pass `theme` and TypeScript accepts it.
 */
export interface FieldColors {
  text: string
  muted: string
  /** `muted` lifted to 4.5:1 — use this, not `muted`, for text. */
  mutedText: string
  border: string
  borderStrong: string
  accent: string
  /** Accent as a text colour, 4.5:1 on the surfaces. */
  accentText: string
  /** Solid accent fill for controls that carry text, with its text colour. */
  accentFill: string
  onAccent: string
  inputBg: string
  chip: string
  panel: string
}
