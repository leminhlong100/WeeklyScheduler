import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { shouldCheckForUpdate } from '@/lib/utils/swUpdate'

/**
 * Registers the service worker and prompts a reload once a new build is ready.
 *
 * Also asks for a new build when the app comes back from the background after
 * more than an hour: an installed PWA on a phone is rarely cold-started, so the
 * browser's own update check (on navigation) can leave it on an old build for days.
 */
export function PwaUpdatePrompt() {
  const { t } = useTranslation()
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null
    },
  })

  useEffect(() => {
    // Registering just checked once; count from now.
    let lastCheck = Date.now()
    const onVisible = () => {
      const registration = registrationRef.current
      if (document.visibilityState !== 'visible' || !registration) return
      // Already downloading one: nothing to ask for.
      if (registration.installing) return
      const now = Date.now()
      if (!shouldCheckForUpdate({ now, lastCheck, online: navigator.onLine })) return
      lastCheck = now
      // A failed check (flaky network) is harmless: the next return tries again.
      registration.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (!needRefresh) return
    toast(t.updateAvailable, {
      duration: Infinity,
      action: { label: t.reloadApp, onClick: () => updateServiceWorker(true) },
    })
  }, [needRefresh, t, updateServiceWorker])

  return null
}
