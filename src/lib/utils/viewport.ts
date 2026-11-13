/**
 * Hàm thuần đọc kích thước màn hình khi bàn phím ảo mở — dùng cho
 * `useVisualViewport` / `useKeyboardOpen`.
 *
 * Hai nền tảng cư xử khác nhau:
 * - Android (Chrome, `interactive-widget=resizes-content`): bàn phím mở thì
 *   `innerHeight` co lại, layout tự né bàn phím.
 * - iOS Safari bỏ qua `interactive-widget`: `innerHeight` giữ nguyên, chỉ
 *   `visualViewport.height` co lại — bàn phím đè lên phần dưới của layout.
 */

/** Các `type` của `<input>` không bật bàn phím chữ/số (hoặc bật bảng chọn riêng). */
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'datetime-local',
  'file',
  'hidden',
  'image',
  'month',
  'radio',
  'range',
  'reset',
  'submit',
  'time',
  'week',
])

interface ElementLike {
  tagName: string
  type?: string
  isContentEditable?: boolean
  readOnly?: boolean
}

/** Phần tử đang focus có bật bàn phím ảo để gõ không. */
export function isTextEntry(el: ElementLike | null | undefined): boolean {
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = el.tagName.toUpperCase()
  if (tag === 'TEXTAREA') return !el.readOnly
  if (tag !== 'INPUT') return false
  if (el.readOnly) return false
  return !NON_TEXT_INPUT_TYPES.has((el.type || 'text').toLowerCase())
}

/** `innerHeight` giảm quá chừng này khi đang gõ thì coi là bàn phím (Android). */
export const KEYBOARD_MIN_DROP_PX = 150
/** `visualViewport` còn dưới tỉ lệ này của `innerHeight` thì coi là bàn phím (iOS). */
export const KEYBOARD_VV_RATIO = 0.8

/**
 * Đoán bàn phím ảo đang mở. Phải đang focus một ô gõ chữ, và màn hình phải thật
 * sự bị thu lại: bàn phím vật lý (iPad, laptop) không thu gì nên không bị tính.
 *
 * `baselineHeight` là `innerHeight` lúc chưa focus ô nào (trước khi bàn phím mở).
 */
export function isKeyboardLikelyOpen(input: {
  textFocused: boolean
  innerHeight: number
  baselineHeight: number
  visualViewportHeight?: number | null
}): boolean {
  const { textFocused, innerHeight, baselineHeight, visualViewportHeight } = input
  if (!textFocused) return false
  if (visualViewportHeight != null && visualViewportHeight < innerHeight * KEYBOARD_VV_RATIO) {
    return true
  }
  return baselineHeight - innerHeight > KEYBOARD_MIN_DROP_PX
}

/**
 * Phần đáy layout đang bị bàn phím đè (px). Chỉ khác 0 trên iOS: Android đã tự
 * co layout nên `visualViewport` khớp với `innerHeight`.
 */
export function keyboardInset(
  innerHeight: number,
  visualViewportHeight: number,
  visualViewportOffsetTop: number,
): number {
  return Math.max(0, Math.round(innerHeight - visualViewportHeight - visualViewportOffsetTop))
}
