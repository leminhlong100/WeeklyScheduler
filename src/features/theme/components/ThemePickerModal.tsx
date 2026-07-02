import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { listThemeDefinitions } from '../themes'
import { useTheme } from '../ThemeContext'
import { ThemeSwatchButton } from './ThemeSwatchButton'

interface ThemePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemePickerModal({ open, onOpenChange }: ThemePickerModalProps) {
  const { t, locale } = useTranslation()
  const { themeKey, setThemeKey, theme } = useTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] w-[calc(100%-2rem)] max-w-[540px] overflow-y-auto rounded-[28px] border-[1.5px] p-5 sm:max-w-[540px] sm:p-6"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle
          className="font-heading text-xl font-extrabold"
          style={{ color: theme.text }}
        >
          {t.themeTitle}
        </DialogTitle>
        <p className="mb-1 text-[13px] font-semibold" style={{ color: theme.muted }}>
          {t.themeSub}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {listThemeDefinitions().map((def) => (
            <ThemeSwatchButton
              key={def.key}
              def={def}
              active={def.key === themeKey}
              activeTheme={theme}
              locale={locale}
              onSelect={() => {
                setThemeKey(def.key)
                onOpenChange(false)
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
