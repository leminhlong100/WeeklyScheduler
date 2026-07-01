export const DECOR_SHAPES = [
  'cloud',
  'star',
  'sparkle',
  'heart',
  'moon',
  'leaf',
  'flower',
  'rainbow',
  'bubble',
  'dot',
] as const

export type DecorShape = (typeof DECOR_SHAPES)[number]

const SHAPE_MARKUP: Record<DecorShape, string> = {
  cloud:
    '<g fill="@"><ellipse cx="34" cy="60" rx="22" ry="17"/><ellipse cx="58" cy="52" rx="27" ry="22"/><ellipse cx="80" cy="60" rx="17" ry="14"/><rect x="30" y="56" width="54" height="20" rx="10"/></g>',
  star: '<path d="M50 8 L60 37 L92 38 L66 57 L76 89 L50 70 L24 89 L34 57 L8 38 L40 37 Z" fill="@"/>',
  sparkle: '<path d="M50 6 Q56 44 94 50 Q56 56 50 94 Q44 56 6 50 Q44 44 50 6 Z" fill="@"/>',
  heart:
    '<path d="M50 84 C16 58 10 35 24 24 C36 15 49 22 50 33 C51 22 64 15 76 24 C90 35 84 58 50 84 Z" fill="@"/>',
  moon: '<path d="M66 10 A40 40 0 1 0 66 90 A32 32 0 1 1 66 10 Z" fill="@"/>',
  leaf: '<path d="M50 92 C18 70 20 28 50 8 C80 28 82 70 50 92 Z" fill="@"/>',
  flower:
    '<g fill="@"><circle cx="50" cy="24" r="15"/><circle cx="24" cy="44" r="15"/><circle cx="34" cy="74" r="15"/><circle cx="66" cy="74" r="15"/><circle cx="76" cy="44" r="15"/></g><circle cx="50" cy="50" r="12" fill="~"/>',
  rainbow:
    '<g fill="none" stroke-linecap="round" stroke-width="11"><path d="M8 84 a42 42 0 0 1 84 0" stroke="#ff5f8f"/><path d="M21 84 a29 29 0 0 1 58 0" stroke="#ffb703"/><path d="M34 84 a16 16 0 0 1 32 0" stroke="#3f9bff"/></g><g fill="#fff8ee"><ellipse cx="13" cy="84" rx="15" ry="11"/><ellipse cx="87" cy="84" rx="15" ry="11"/></g>',
  bubble: '<circle cx="50" cy="50" r="38" fill="none" stroke="@" stroke-width="7"/>',
  dot: '<circle cx="50" cy="50" r="28" fill="@"/>',
}

/**
 * Builds a `url("data:image/svg+xml,...")` CSS background value for one of
 * the cute decorative shapes, tinted with `color`.
 */
export function buildShapeDataUri(shape: DecorShape, color = '#ff9ec4'): string {
  const inner = (SHAPE_MARKUP[shape] ?? SHAPE_MARKUP.star)
    .split('@')
    .join(color)
    .split('~')
    .join('#fff4bf')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>${inner}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
