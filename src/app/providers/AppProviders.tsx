import { type ReactNode, useState } from 'react'
import { isMissingSchemaError } from '@/lib/utils/errorMessage'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { AmountVisibilityProvider } from '@/features/expenses/AmountVisibilityContext'
import { PreferenceSync } from '@/features/profile/components/PreferenceSync'
import { LocaleProvider } from '@/features/i18n/LocaleContext'
import { ConfirmProvider } from '@/components/common/ConfirmDialog'
import { ThemeUiProvider } from '@/features/theme/components/ThemeUiProvider'
import { PwaUpdatePrompt } from '@/app/PwaUpdatePrompt'
import { QUERY_CACHE_BUSTER, queryPersister, shouldPersistQuery } from '@/lib/queryPersister'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // One retry for flaky networks, none when the server lacks the table,
            // column or RPC (migration not run yet): that will not fix itself.
            retry: (failureCount, error) => failureCount < 1 && !isMissingSchemaError(error),
          },
        },
      }),
  )

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {/* AuthProvider sits above ThemeProvider because themes are now per-account:
          ThemeProvider calls useCustomThemes, which needs useAuth. The reverse
          order worked only while themes were entirely local. AuthProvider itself
          touches nothing but supabase.auth, so it is safe above. */}
      <LocaleProvider>
        <AuthProvider>
          <ThemeProvider>
            {/* Here rather than in the pages: hydrating the profile row into local
                state is a once-per-session step, and a per-page mount turned every
                module switch into another chance to undo the user's last choice. */}
            <PreferenceSync />
            <ConfirmProvider>
              <AmountVisibilityProvider>
                <TooltipProvider>
                  {/* Inside ConfirmProvider: the picker and studio ask before discarding. */}
                  <ThemeUiProvider>
                    <BrowserRouter>{children}</BrowserRouter>
                  </ThemeUiProvider>
                  <Toaster
                    position="top-center"
                    richColors
                    offset={{
                      top: 'calc(16px + env(safe-area-inset-top) * var(--sched-notch-scale))',
                    }}
                    mobileOffset={{
                      top: 'calc(16px + env(safe-area-inset-top) * var(--sched-notch-scale))',
                    }}
                  />
                  <PwaUpdatePrompt />
                </TooltipProvider>
              </AmountVisibilityProvider>
            </ConfirmProvider>
          </ThemeProvider>
        </AuthProvider>
      </LocaleProvider>
    </PersistQueryClientProvider>
  )
}
