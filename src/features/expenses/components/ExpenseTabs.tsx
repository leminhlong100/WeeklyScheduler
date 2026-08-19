import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'

export type ExpenseTab = 'list' | 'report'

/**
 * Danh sách và báo cáo dùng chung tháng đang chọn ở header, chỉ đổi cách nhìn.
 * Tách hai tab thay vì xếp chồng: cả hai cùng hiện thì tổng tháng xuất hiện hai
 * lần với hai kiểu trình bày khác nhau, đọc rất dễ nhầm.
 */
export function ExpenseTabs({
  value,
  onChange,
}: {
  value: ExpenseTab
  onChange: (tab: ExpenseTab) => void
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const tabs: { id: ExpenseTab; label: string }[] = [
    { id: 'list', label: t.tabExpenseList },
    { id: 'report', label: t.tabReport },
  ]

  return (
    <div
      role="tablist"
      className="flex gap-1 rounded-[14px] border-[1.5px] p-1"
      style={{ borderColor: theme.border, background: theme.chip }}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className="flex-1 rounded-[10px] py-1.5 text-[13px] font-extrabold transition-transform duration-150 active:scale-[0.98]"
            style={{
              background: active ? theme.accent : 'transparent',
              color: active ? '#fff' : theme.muted,
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
