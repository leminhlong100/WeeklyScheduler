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
  border: string
  borderStrong: string
  accent: string
  inputBg: string
  chip: string
  panel: string
}
