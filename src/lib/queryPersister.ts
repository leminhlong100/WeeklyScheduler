import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
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

/** Bump this if a cached query's shape ever changes incompatibly. */
export const QUERY_CACHE_BUSTER = 'v1'
