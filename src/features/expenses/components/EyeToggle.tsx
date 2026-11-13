import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useAmountVisibility } from '../AmountVisibilityContext'

/** Nút con mắt DUY NHẤT của trang (trước đây có hai nút ở hai chỗ). */
export function EyeToggle() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { hidden, toggleHidden } = useAmountVisibility()
  const label = hidden ? t.showAmounts : t.hideAmounts
  return (
    <button
      type="button"
      onClick={toggleHidden}
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      className="-mt-2 -mr-2 grid size-11 flex-shrink-0 place-items-center rounded-full transition-transform active:scale-95"
      style={{ color: theme.mutedText }}
    >
      {hidden ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
    </button>
  )
}
