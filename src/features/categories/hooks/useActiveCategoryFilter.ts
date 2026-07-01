import { useMemo, useState } from 'react'

/**
 * Sidebar category visibility toggle. Client-only, not persisted: absence
 * from `inactiveIds` means active, so newly created/loaded categories are
 * active by default without needing to sync against the categories query.
 */
export function useActiveCategoryFilter() {
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    setInactiveIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isActive = useMemo(() => (id: string) => !inactiveIds.has(id), [inactiveIds])

  return { isActive, toggle }
}
