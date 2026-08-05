import type { ReactNode } from 'react'
import type { DerivedTheme } from '@/features/theme/types'
import { cn } from '@/lib/utils'
import { DecorBackground } from './DecorBackground'
import { ThemeArtLayer } from './ThemeArtLayer'

interface AppShellProps {
  theme: DerivedTheme
  sidebar: ReactNode
  header: ReactNode
  /** Mobile-only bottom action bar, rendered below the scrollable content. */
  bottomBar?: ReactNode
  /**
   * Leaves room for the theme studio's right-hand dock on desktop, so the grid
   * narrows instead of being covered. On mobile the studio is a bottom sheet and
   * this does nothing.
   */
  insetRight?: boolean
  children: ReactNode
}

/** The rounded "window card" chrome: page background decor, sidebar + main column. */
export function AppShell({
  theme,
  sidebar,
  header,
  bottomBar,
  insetRight = false,
  children,
}: AppShellProps) {
  return (
    <div
      className="scrollbar-hidden relative flex h-[100dvh] w-full items-center justify-center overflow-auto p-0 sm:p-[26px]"
      style={{
        background: theme.pageBg,
        color: theme.text,
        fontFamily: "'Baloo 2','Quicksand','Noto Sans SC','Noto Sans JP',sans-serif",
      }}
    >
      {/* Scenery first, then the floating shapes on top of it. */}
      <ThemeArtLayer theme={theme} variant="page" />
      <DecorBackground theme={theme} variant="main" />

      <div
        className={cn(
          'relative z-[1] flex h-[100dvh] w-full max-w-full flex-col overflow-hidden rounded-none transition-[margin] duration-200 sm:h-[calc(100vh-52px)] sm:max-w-[1460px] sm:rounded-[26px]',
          // 380px dock + the 26px gutter on each side.
          insetRight && 'md:mr-[406px]',
        )}
        style={{
          background: theme.panel,
          border: `1.5px solid ${theme.borderStrong}`,
          boxShadow: theme.windowShadow,
        }}
      >
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {sidebar}
          <main className="relative flex min-w-0 flex-1 flex-col" style={{ background: theme.mainBg }}>
            {/* No z-index, so it layers under the z-50 content well below. */}
            <ThemeArtLayer theme={theme} variant="main" />
            {header}
            <div className="relative z-[50] min-h-0 flex-1 overflow-auto">{children}</div>
            {bottomBar}
          </main>
        </div>
      </div>
    </div>
  )
}
