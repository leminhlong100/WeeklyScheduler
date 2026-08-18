import { MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { MAX_CUSTOM_THEMES } from '../art/constants'
import type { CustomThemeRecord } from '../recipe/types'
import { listThemeDefinitions } from '../themes'
import { useTheme } from '../ThemeContext'
import { customThemeId } from '../types'
import { ThemeSwatchButton } from './ThemeSwatchButton'

interface ThemePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Closes the picker and opens the studio; the two are never open together. */
  onEditTheme: (record: CustomThemeRecord | null) => void
}

export function ThemePickerModal({ open, onOpenChange, onEditTheme }: ThemePickerModalProps) {
  const { t, locale } = useTranslation()
  const { themeId, setThemeId, theme, customThemes, removeCustomTheme, saveCustomTheme, newCustomThemeId } =
    useTheme()

  const atLimit = customThemes.length >= MAX_CUSTOM_THEMES

  const openStudio = (record: CustomThemeRecord | null) => {
    // The studio needs to see the app it is restyling, so the picker gets out of
    // the way first.
    onOpenChange(false)
    onEditTheme(record)
  }

  const duplicate = async (record: CustomThemeRecord) => {
    if (atLimit) {
      toast.error(t.themeLimitReached.replace('{n}', String(MAX_CUSTOM_THEMES)))
      return
    }
    try {
      // Artwork URLs are copied by reference rather than re-uploaded. Both rows
      // then point at the same objects, so deleting either would break the other —
      // which is exactly why `deleteCustomTheme` only removes objects under the
      // deleted theme's own folder.
      const saved = await saveCustomTheme({
        id: newCustomThemeId(),
        isNew: true,
        name: `${record.name} 2`.slice(0, 40),
        icon: record.icon,
        recipe: record.recipe,
        overrides: record.overrides,
        art: record.art,
      })
      if (!saved) toast.error(t.themeSaveFailed)
    } catch {
      toast.error(t.themeSaveFailed)
    }
  }

  const remove = async (record: CustomThemeRecord) => {
    if (!window.confirm(t.themeDeleteConfirm)) return
    try {
      await removeCustomTheme(record.id)
    } catch {
      toast.error(t.somethingWentWrong)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-[28px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[540px] sm:rounded-[28px] sm:p-6"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
          {t.themeTitle}
        </DialogTitle>
        <p className="mb-1 text-[13px] font-semibold" style={{ color: theme.muted }}>
          {t.themeSub}
        </p>

        {/* "Mine" first: a theme the user built is a stronger candidate than any
            preset, and burying it under sixteen built-ins would say otherwise. */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[11px] font-extrabold" style={{ color: theme.muted }}>
            {t.themeMine}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                if (atLimit) {
                  toast.error(t.themeLimitReached.replace('{n}', String(MAX_CUSTOM_THEMES)))
                  return
                }
                openStudio(null)
              }}
              className="flex min-h-[118px] flex-col items-center justify-center gap-1.5 rounded-[20px] border-[2.5px] border-dashed"
              style={{ borderColor: theme.accent, color: theme.accent }}
            >
              <span
                className="grid size-9 place-items-center rounded-full"
                style={{ background: theme.brandGrad, color: '#ffffff' }}
              >
                <Plus className="size-4" />
              </span>
              <span className="text-[12px] font-extrabold">{t.themeCreate}</span>
            </button>

            {customThemes.map((record) => (
              <div key={record.id} className="relative">
                <ThemeSwatchButton
                  def={record.definition}
                  active={record.definition.key === themeId}
                  activeTheme={theme}
                  locale={locale}
                  onSelect={() => {
                    setThemeId(customThemeId(record.id))
                    onOpenChange(false)
                  }}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full shadow-md"
                    style={{ background: 'rgba(255,255,255,.92)', color: record.definition.accent }}
                    aria-label={record.name}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openStudio(record)}>
                      {t.themeEdit}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void duplicate(record)}>
                      {t.themeDuplicate}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void remove(record)}>
                      {t.themeDelete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 flex flex-col gap-2">
          <h3 className="text-[11px] font-extrabold" style={{ color: theme.muted }}>
            {t.themePresets}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listThemeDefinitions().map((def) => (
              <ThemeSwatchButton
                key={def.key}
                def={def}
                active={def.key === themeId}
                activeTheme={theme}
                locale={locale}
                onSelect={() => {
                  setThemeId(def.key)
                  onOpenChange(false)
                }}
              />
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}
