import type { ReactNode } from 'react'
import { MoreHorizontal, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { describeError } from '@/lib/utils/errorMessage'

import { useConfirm } from '@/components/common/ConfirmDialog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useBackToClose } from '@/hooks/useBackToClose'
import { MAX_CUSTOM_THEMES } from '../art/constants'
import type { CustomThemeRecord } from '../recipe/types'
import { listThemeDefinitions } from '../themes'
import { useTheme } from '../ThemeContext'
import { customThemeId, isThemeKey } from '../types'
import { ThemeSwatchButton } from './ThemeSwatchButton'
import type { StudioTarget } from './ThemeUiProvider'

interface ThemePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Closes the picker and opens the studio; the two are never open together. */
  onEditTheme: (target: StudioTarget) => void
}

export function ThemePickerModal({ open, onOpenChange, onEditTheme }: ThemePickerModalProps) {
  const { t, locale } = useTranslation()
  const confirm = useConfirm()
  const { themeId, setThemeId, theme, customThemes, removeCustomTheme, saveCustomTheme, newCustomThemeId } =
    useTheme()
  // Nút Back của điện thoại đóng bảng chọn, không rời trang.
  useBackToClose(open, () => onOpenChange(false))

  const atLimit = customThemes.length >= MAX_CUSTOM_THEMES

  const openStudio = (target: StudioTarget) => {
    if (target.record === null && atLimit) {
      toast.error(t.themeLimitReached.replace('{n}', String(MAX_CUSTOM_THEMES)))
      return
    }
    // The studio needs to see the app it is restyling, so the picker gets out of
    // the way first.
    onOpenChange(false)
    onEditTheme(target)
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
    if (!(await confirm({ message: t.themeDeleteConfirm }))) return
    try {
      await removeCustomTheme(record.id)
    } catch (error) {
      toast.error(describeError(t, error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-[28px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[540px] sm:rounded-[28px] sm:p-6"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
              {t.themeTitle}
            </DialogTitle>
            <p className="mb-1 text-[13px] font-semibold" style={{ color: theme.mutedText }}>
              {t.themeSub}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t.studioClose}
            title={t.studioClose}
            className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full"
            style={{ color: theme.mutedText }}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Có sẵn trước: đổi sang một theme có sẵn là việc của hầu hết mọi người;
            ô "Tạo" to đứng đầu từng đẩy chúng xuống nửa dưới màn hình điện thoại. */}
        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-extrabold" style={{ color: theme.mutedText }}>
            {t.themePresets}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listThemeDefinitions().map((def) => (
              <div key={def.key} className="relative">
                <ThemeSwatchButton
                  def={def}
                  active={def.key === themeId}
                  activeTheme={theme}
                  locale={locale}
                  onSelect={() => {
                    setThemeId(def.key)
                    onOpenChange(false)
                  }}
                />
                {isThemeKey(def.key) && (
                  <CardMenu label={`${def.name[locale]} — ${t.themeCreateFrom}`}>
                    <DropdownMenuItem
                      onClick={() =>
                        isThemeKey(def.key) && openStudio({ record: null, basePreset: def.key })
                      }
                    >
                      {t.themeCreateFrom}
                    </DropdownMenuItem>
                  </CardMenu>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 flex flex-col gap-2">
          <h3 className="text-[12px] font-extrabold" style={{ color: theme.mutedText }}>
            {t.themeMine}
          </h3>
          {customThemes.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  <CardMenu label={record.name}>
                    <DropdownMenuItem onClick={() => openStudio({ record })}>
                      {t.themeEdit}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void duplicate(record)}>
                      {t.themeDuplicate}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void remove(record)}>
                      {t.themeDelete}
                    </DropdownMenuItem>
                  </CardMenu>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => openStudio({ record: null })}
            className="flex min-h-12 items-center justify-center gap-2 rounded-[16px] border-[2px] border-dashed px-4 text-[14px] font-extrabold"
            style={{ borderColor: theme.borderStrong, color: theme.accentText }}
          >
            <span
              className="grid size-7 place-items-center rounded-full"
              style={{ background: theme.brandGrad, color: theme.onBrand }}
            >
              <Plus className="size-4" />
            </span>
            {t.themeCreate}
          </button>
        </section>
      </DialogContent>
    </Dialog>
  )
}

/** Nút ⋯ ở góc thẻ: icon nhỏ cho gọn, vùng chạm 44px. */
function CardMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="absolute top-0 right-0 flex size-11 items-start justify-end p-1.5"
        aria-label={label}
        title={label}
      >
        <span
          className="grid size-7 place-items-center rounded-full shadow-md"
          style={{ background: 'rgba(255,255,255,.92)', color: '#3a3550' }}
        >
          <MoreHorizontal className="size-4" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
