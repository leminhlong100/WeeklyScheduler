import { type ReactNode, useState } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { LocaleProvider } from '@/features/i18n/LocaleContext'
import { PwaUpdatePrompt } from '@/app/PwaUpdatePrompt'
import { QUERY_CACHE_BUSTER, queryPersister } from '@/lib/queryPersister'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  )

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster: QUERY_CACHE_BUSTER,
      }}
    >
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <BrowserRouter>{children}</BrowserRouter>
              <Toaster position="top-center" richColors />
              <PwaUpdatePrompt />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </PersistQueryClientProvider>
  )
}
