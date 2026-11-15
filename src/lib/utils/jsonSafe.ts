/**
 * True khi `value` đi qua `JSON.stringify` → `JSON.parse` mà không đổi kiểu:
 * chỉ gồm null, boolean, số hữu hạn, chuỗi, mảng và object thường.
 *
 * Cache của TanStack Query được persist xuống IndexedDB dưới dạng JSON. Một
 * `Map`/`Set` sẽ thành `{}`, `Date` thành chuỗi, instance của class mất method —
 * lần mở app sau component đọc cache gọi `.get()`/`.getTime()` là sập trang.
 */
export function isJsonSafe(value: unknown, depth = 0): boolean {
  if (depth > 64) return false
  if (value === null) return true
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return true
    case 'number':
      return Number.isFinite(value)
    case 'object': {
      if (Array.isArray(value)) return value.every((v) => isJsonSafe(v, depth + 1))
      const proto = Object.getPrototypeOf(value)
      if (proto !== Object.prototype && proto !== null) return false
      for (const key in value) {
        const v = (value as Record<string, unknown>)[key]
        // `undefined` trong object chỉ bị bỏ khỏi JSON — đọc lại vẫn là undefined.
        if (v !== undefined && !isJsonSafe(v, depth + 1)) return false
      }
      return true
    }
    default:
      return false
  }
}
