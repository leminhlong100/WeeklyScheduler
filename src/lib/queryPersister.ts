import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { defaultShouldDehydrateQuery, type Query } from '@tanstack/react-query'
import { isJsonSafe } from '@/lib/utils/jsonSafe'
import { get, set, del } from 'idb-keyval'

/**
 * IndexedDB-backed persister for the React Query cache — chosen over
 * localStorage because custom stickers cache base64 image data URLs that
 * can add up to several hundred KB, comfortably over localStorage's ~5MB
 * quota but nowhere near IndexedDB's.
 */
export const queryPersister = createAsyncStoragePersister({
  key: 'weeklyScheduler.queryCache',
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
})

/**
 * Bump this if a cached query's shape ever changes incompatibly.
 *
 * v2: `['profile', uid]` gained `custom_theme_id`. A persisted v1 profile lacks
 * it, so on the first load after deploy the sync hook would compare against
 * `undefined` and push the local (preset-only) state back over the user's saved
 * custom selection.
 */
export const QUERY_CACHE_BUSTER = 'v2'

/**
 * Chỉ persist query đã thành công VÀ có dữ liệu đi qua JSON được. Một queryFn
 * lỡ trả `Map`/`Set`/`Date` sẽ không bị ghi xuống (bản khôi phục `{}` từng làm
 * trắng trang Chi tiêu) — query đó chỉ phải tải lại ở lần mở sau. Ở dev báo
 * lỗi ra console để người viết code thấy ngay.
 */
export function shouldPersistQuery(query: Query): boolean {
  if (!defaultShouldDehydrateQuery(query)) return false
  if (isJsonSafe(query.state.data)) return true
  if (import.meta.env.DEV) {
    console.error('[queryPersister] query data is not JSON-safe, not persisting', query.queryKey)
  }
  return false
}
