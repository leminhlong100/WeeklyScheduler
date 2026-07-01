import { type ReactNode, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { LocaleProvider } from '@/features/i18n/LocaleContext'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <BrowserRouter>{children}</BrowserRouter>
              <Toaster position="top-center" richColors />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  )
}
