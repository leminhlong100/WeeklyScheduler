interface ColorSwatchesProps {
  /** The colour currently held, or null when nothing is picked yet. */
  value: string | null
  onChange: (next: string) => void
  presets: string[]
  /** Ring drawn around the active swatch — usually the surface's text colour. */
  ringColor: string
  customLabel: string
  /** Where the OS picker opens while `value` is null. Defaults to the first preset. */
  fallbackColor?: string
}

/** Rainbow ring on the custom swatch, shown until a custom colour is picked. */
const HUE_WHEEL =
  'conic-gradient(#ff5d7a,#ff9d5c,#f2d24b,#5fd0a0,#4bb4f0,#7b83ff,#b47cf0,#ff5d7a)'

/**
 * A row of preset circles followed by an "any colour" swatch.
 *
 * Returns bare buttons rather than its own container so callers can drop extra
 * controls into the same wrapping row — the task picker puts a "follow the
 * category" chip ahead of them.
 *
 * The native `<input type="color">` is deliberately the escape hatch rather than
 * the main control: presets keep the common choices one tap away, and the input
 * hands back exactly the `#rrggbb` form both colour columns' check constraints
 * accept, so nothing parses or normalises on the way to the database.
 */
export function ColorSwatches({
  value,
  onChange,
  presets,
  ringColor,
  customLabel,
  fallbackColor,
}: ColorSwatchesProps) {
  const custom = value !== null && !presets.includes(value.toLowerCase())

  return (
    <>
      {presets.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="h-8 w-8 rounded-full border-2 transition-transform"
          style={{
            background: color,
            borderColor: value === color ? ringColor : 'transparent',
            transform: value === color ? 'scale(1.12)' : undefined,
          }}
          aria-label={color}
        />
      ))}

      <label
        className="relative grid h-8 w-8 place-items-center rounded-full border-2 transition-transform"
        style={{
          background: custom ? value : HUE_WHEEL,
          borderColor: custom ? ringColor : 'transparent',
          transform: custom ? 'scale(1.12)' : undefined,
        }}
        title={customLabel}
      >
        <input
          type="color"
          value={value ?? fallbackColor ?? presets[0]}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label={customLabel}
        />
      </label>
    </>
  )
}
