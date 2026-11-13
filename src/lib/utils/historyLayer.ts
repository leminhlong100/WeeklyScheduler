/**
 * Phần thuần của `useBackToClose`: đọc/ghi dấu "lớp" (sheet, drawer, hộp xác
 * nhận) trong `history.state`.
 *
 * Mỗi lớp đang mở có một mục lịch sử riêng, cùng URL với mục bên dưới. Mục đó
 * giữ nguyên mọi khoá của React Router (`usr`, `key`, `idx`) để router vẫn coi
 * là cùng một trang, và thêm hai khoá riêng: id của lớp và độ sâu (lớp đầu = 1,
 * hộp xác nhận mở trên sheet = 2).
 */

export const LAYER_ID_KEY = '__layer'
export const LAYER_DEPTH_KEY = '__layerDepth'

type State = Record<string, unknown>

const asState = (state: unknown): State | null =>
  typeof state === 'object' && state !== null ? (state as State) : null

/** Id lớp của mục lịch sử đang đứng, hoặc `undefined` nếu đó là mục thường. */
export function layerIdOf(state: unknown): string | undefined {
  const id = asState(state)?.[LAYER_ID_KEY]
  return typeof id === 'string' ? id : undefined
}

/** Độ sâu lớp của mục đang đứng; mục thường (không có lớp nào mở) là 0. */
export function layerDepthOf(state: unknown): number {
  const depth = asState(state)?.[LAYER_DEPTH_KEY]
  return typeof depth === 'number' && Number.isFinite(depth) && depth > 0 ? depth : 0
}

/**
 * State cho mục lịch sử của một lớp mới mở trên `current`: chép nguyên state
 * hiện tại (giữ khoá của router) rồi gắn id + độ sâu kế tiếp.
 */
export function layerState(current: unknown, id: string): State {
  return {
    ...(asState(current) ?? {}),
    [LAYER_ID_KEY]: id,
    [LAYER_DEPTH_KEY]: layerDepthOf(current) + 1,
  }
}

/**
 * Sau một `popstate`, lớp ở độ sâu `depth` đã bị Back đóng khi mục vừa tới nằm
 * nông hơn nó. Đứng đúng ở độ sâu đó (hộp xác nhận bên trên vừa đóng) hoặc sâu
 * hơn (Forward) thì lớp vẫn mở.
 */
export function isLayerPopped(depth: number, stateAfterPop: unknown): boolean {
  return layerDepthOf(stateAfterPop) < depth
}

/** State đã gỡ dấu lớp (giữ nguyên mọi khoá khác, nhất là khoá của router). */
export function withoutLayer(state: unknown): State {
  const rest = { ...(asState(state) ?? {}) }
  delete rest[LAYER_ID_KEY]
  delete rest[LAYER_DEPTH_KEY]
  return rest
}
