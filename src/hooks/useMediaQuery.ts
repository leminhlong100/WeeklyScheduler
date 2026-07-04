import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = () => setMatches(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** True below the `md` breakpoint — the point at which the layout switches to its mobile treatment. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/**
 * True on touch-primary devices (tablets like iPad, regardless of orientation).
 * Distinct from `useIsMobile`: an iPad in either orientation is `>= 768px` wide
 * so it renders the desktop-style grid, but it still has no mouse and only a
 * fraction of a laptop's width — so it should start with the sidebar collapsed.
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)')
}
