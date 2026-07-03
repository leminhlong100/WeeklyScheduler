import { useState } from 'react'
import { Share2Icon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'

const DISMISSED_KEY = 'weeklyScheduler.iosInstallHintDismissed'

/** iOS Safari never fires `beforeinstallprompt` — this is the only way to tell users how to install. */
function isIosSafariTab(): boolean {
  const ua = window.navigator.userAgent
  const isIphoneOrIpad = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports its UA as a Mac, but keeps touch support — the standard sniff for that case.
  const isIpadOs13Plus = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  if (!isIphoneOrIpad && !isIpadOs13Plus) return false

  const isStandalone =
    (window.navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  return !isStandalone
}

/**
 * One-time dismissible hint shown only on iOS Safari (outside standalone
 * mode), explaining the manual Share -> Add to Home Screen install flow
 * since Safari has no equivalent to Chrome's `beforeinstallprompt`.
 */
export function IosInstallBanner() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [visible, setVisible] = useState(() => {
    if (window.localStorage.getItem(DISMISSED_KEY)) return false
    return isIosSafariTab()
  })

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="mx-3 mt-3 flex items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 py-2.5 sm:mx-4"
      style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
    >
      <Share2Icon className="size-5 flex-shrink-0" style={{ color: theme.accent }} />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug font-semibold">{t.iosInstallHint}</p>
      <button
        type="button"
        onClick={dismiss}
        className="flex-shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-extrabold"
        style={{ background: theme.accent, color: '#fff' }}
      >
        {t.gotIt}
      </button>
    </div>
  )
}
