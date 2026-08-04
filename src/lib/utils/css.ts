/**
 * Escaping for values that get interpolated into inline CSS.
 *
 * The theme system builds its declarations as strings (`background: url(...)`,
 * gradients, `rgba()`) and hands them to React's `style` prop, so anything a
 * user can influence has to be escaped at the sink. React does not parse or
 * sanitise `style` string values — it assigns them straight to
 * `element.style[prop]`, and a `"` closing the url() there would let the rest of
 * the value start a new declaration.
 */

/** Characters that can break out of a double-quoted CSS `url("…")`. */
const CSS_URL_UNSAFE = /["'()\\\n\r]/g

/**
 * Wraps a URL for use in a CSS `url()`.
 *
 * Two layers on purpose: `encodeURI` normalises spaces and non-ASCII into
 * percent-escapes (a bare space also terminates the token), then the regex
 * catches the quote/paren/backslash set that `encodeURI` deliberately leaves
 * alone because they are legal URI characters.
 *
 * Returns an empty string for a falsy src so callers can interpolate
 * unconditionally without emitting `url("undefined")`, which the browser would
 * dutifully request.
 */
export function cssUrl(src: string | undefined | null): string {
  if (!src) return ''
  const escaped = encodeURI(src).replace(CSS_URL_UNSAFE, (ch) => `\\${ch}`)
  return `url("${escaped}")`
}
