import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { useTheme } from '@/features/theme/ThemeContext'
import { categoryScopeKey, useAmountVisibility } from '../AmountVisibilityContext'
import { useExpenseCategories } from '../hooks/useExpenseCategories'

function Option({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: React.ReactNode
}) {
  const { theme } = useTheme()
  return (
    <label
      className="flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2 text-[13px] font-bold"
      style={{ borderColor: theme.border, background: theme.chip, color: theme.text }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 flex-shrink-0"
        style={{ accentColor: theme.accent }}
      />
      {children}
    </label>
  )
}

/**
 * Chọn từng mục để ẩn số tiền: tổng tháng/năm/ngày và theo danh mục (lương, đầu
 * tư...). Chỉ có tác dụng khi nút ẩn tổng đang tắt — ẩn tổng là "che hết".
 */
export function AmountVisibilityDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { hidden, hiddenScopes, toggleScope } = useAmountVisibility()
  const { data: categories = [] } = useExpenseCategories()

  const scopes = [
    { key: 'month', label: t.hideScopeMonth },
    { key: 'year', label: t.hideScopeYear },
    { key: 'day', label: t.hideScopeDay },
  ] as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-[26px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[440px] sm:rounded-[26px] sm:p-6"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
          {t.hideCustomTitle}
        </DialogTitle>

        {hidden && (
          <p className="text-[12px] font-semibold" style={{ color: theme.muted }}>
            {t.hideCustomHint}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {scopes.map((s) => (
            <Option
              key={s.key}
              checked={hiddenScopes.has(s.key)}
              onChange={() => toggleScope(s.key)}
            >
              {s.label}
            </Option>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <div
              className="text-[11px] font-extrabold uppercase tracking-wider"
              style={{ color: theme.muted }}
            >
              {t.hideScopeCategories}
            </div>
            {categories.map((c) => (
              <Option
                key={c.id}
                checked={hiddenScopes.has(categoryScopeKey(c.id))}
                onChange={() => toggleScope(categoryScopeKey(c.id))}
              >
                <span>{c.emoji}</span>
                <span className="truncate">{translateExpenseCategoryName(c.name, t)}</span>
              </Option>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
