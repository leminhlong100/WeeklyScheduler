import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/features/theme/ThemeContext'

/** The app's recurring pill-shaped gradient CTA (header, modals, auth forms). */
export function GradientButton({ className, style, ...props }: ComponentProps<typeof Button>) {
  const { theme } = useTheme()

  return (
    <Button
      className={cn('rounded-2xl border-none font-extrabold text-white hover:opacity-95', className)}
      style={{ background: theme.brandGrad, boxShadow: `0 7px 18px ${theme.brandShadow}`, ...style }}
      {...props}
    />
  )
}
