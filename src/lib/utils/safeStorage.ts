/**
 * `localStorage` that never throws.
 *
 * Reading can throw (Safari with site data blocked: SecurityError) and writing
 * can throw (quota exceeded — iOS gives ~5 MB, and image stickers are stored as
 * data URLs). Called from render or an effect, either one took the whole page
 * down to the error screen. A preference that fails to save just is not
 * remembered; the app keeps working.
 */
export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Returns false when the value could not be stored. */
export function storageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`[storage] could not save "${key}"`, error)
    return false
  }
}

export function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing to do: the key could not have been written either.
  }
}

/** Parsed JSON, or `fallback` when missing, unreadable or rejected by `isValid`. */
export function storageGetJson<T>(key: string, isValid: (v: unknown) => v is T, fallback: T): T {
  const raw = storageGet(key)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}
