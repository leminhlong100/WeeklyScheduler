import type { ReactNode } from 'react'
import { useTheme } from '@/features/theme/ThemeContext'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { theme } = useTheme()

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center p-6"
      style={{ background: theme.pageBg, fontFamily: "'Baloo 2','Quicksand',sans-serif" }}
    >
      <div
        className="w-full max-w-[420px] rounded-[26px] border-[1.5px] p-7 shadow-2xl"
        style={{
          background: theme.panel,
          borderColor: theme.borderStrong,
          boxShadow: theme.windowShadow,
          color: theme.text,
        }}
      >
        <div className="mb-6 flex items-center gap-3">
          <div
            className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl shadow-md"
            style={{ background: 'rgba(255,255,255,0.92)' }}
          >
            <img src="/favicon.png" alt="" className="h-7 w-7" />
          </div>
          <div
            className="font-heading text-lg font-extrabold"
            style={{ color: theme.text }}
          >
            Weekly Scheduler
          </div>
        </div>

        <h1 className="font-heading mb-1 text-xl font-extrabold" style={{ color: theme.text }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mb-5 text-sm font-medium" style={{ color: theme.muted }}>
            {subtitle}
          </p>
        )}
        {!subtitle && <div className="mb-5" />}

        {children}

        {footer && <div className="mt-5 text-center text-sm">{footer}</div>}
      </div>
    </div>
  )
}
