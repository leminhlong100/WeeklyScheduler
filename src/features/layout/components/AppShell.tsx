import type { ReactNode } from 'react'
import type { DerivedTheme } from '@/features/theme/types'
import { DecorBackground } from './DecorBackground'

interface AppShellProps {
  theme: DerivedTheme
  sidebar: ReactNode
  header: ReactNode
  children: ReactNode
}

/** The rounded "window card" chrome: page background decor, sidebar + main column. */
export function AppShell({ theme, sidebar, header, children }: AppShellProps) {
  return (
    <div
      className="scrollbar-hidden relative flex h-[100dvh] w-full items-center justify-center overflow-auto p-0 sm:p-[26px]"
      style={{
        background: theme.pageBg,
        color: theme.text,
        fontFamily: "'Baloo 2','Quicksand','Noto Sans SC','Noto Sans JP',sans-serif",
      }}
    >
      <DecorBackground theme={theme} variant="main" />

      <div
        className="relative z-[1] flex h-[100dvh] w-full max-w-full flex-col overflow-hidden rounded-none sm:h-[calc(100vh-52px)] sm:max-w-[1460px] sm:rounded-[26px]"
        style={{
          background: theme.panel,
          border: `1.5px solid ${theme.borderStrong}`,
          boxShadow: theme.windowShadow,
        }}
      >
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {sidebar}
          <main className="relative flex min-w-0 flex-1 flex-col" style={{ background: theme.mainBg }}>
            {header}
            <div className="relative z-[50] min-h-0 flex-1 overflow-auto">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
