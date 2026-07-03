import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from '@/features/i18n/LocaleContext'

/** Registers the service worker and prompts a reload once a new build is ready. */
export function PwaUpdatePrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    toast(t.updateAvailable, {
      duration: Infinity,
      action: { label: t.reloadApp, onClick: () => updateServiceWorker(true) },
    })
  }, [needRefresh, t, updateServiceWorker])

  return null
}
