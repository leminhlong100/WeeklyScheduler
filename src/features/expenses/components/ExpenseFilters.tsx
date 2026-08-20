import { SearchIcon, XIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { UNCATEGORIZED } from '../utils/report'
import { isFilterActive, type ExpenseFilter, type KindFilter } from '../utils/filter'

const KIND_TABS: KindFilter[] = ['all', 'expense', 'income']

interface ExpenseFiltersProps {
  value: ExpenseFilter
  onChange: (next: ExpenseFilter) => void
  categories: ExpenseCategory[]
  /** Số dòng còn lại sau khi lọc — hiện ngay cạnh nút xoá lọc. */
  resultCount: number
}

export function ExpenseFilters({ value, onChange, categories, resultCount }: ExpenseFiltersProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()

  const kindLabel: Record<KindFilter, string> = {
    all: t.filterKindAll,
    expense: t.filterKindExpense,
    income: t.filterKindIncome,
  }

  // Danh mục thu và danh mục chi không dùng lẫn, nên bộ chọn chỉ hiện nhóm khớp
  // với tab đang chọn — để tránh một tổ hợp không bao giờ có kết quả
  // ("Chi" + danh mục "Lương").
  const visibleCategories =
    value.kind === 'all' ? categories : categories.filter((c) => c.kind === value.kind)

  const categoryOptions = [
    { value: 'all', label: t.filterCategoryAll },
    ...visibleCategories.map((c) => ({
      value: c.id,
      label: `${c.emoji} ${translateExpenseCategoryName(c.name, t)}`,
    })),
    { value: UNCATEGORIZED, label: t.expenseUncategorized },
  ]

  const active = isFilterActive(value)
  const inputStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          style={{ color: theme.muted }}
        />
        <input
          type="search"
          // Bàn phím điện thoại hiện nút "Tìm" thay vì "Enter", và ô lọc tại chỗ
          // này không cần gửi gì cả — gõ tới đâu danh sách đổi tới đó.
          enterKeyHint="search"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder={t.filterSearchPh}
          aria-label={t.filterSearchPh}
          className="h-10 w-full rounded-xl border-[1.5px] pl-9 pr-9 text-[13.5px] font-semibold outline-none"
          style={inputStyle}
        />
        {value.query !== '' && (
          <button
            type="button"
            onClick={() => onChange({ ...value, query: '' })}
            aria-label={t.filterClear}
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg"
            style={{ color: theme.muted }}
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label={t.filterKindAll}
          className="flex gap-1 rounded-[13px] border-[1.5px] p-1"
          style={{ borderColor: theme.border, background: theme.chip }}
        >
          {KIND_TABS.map((kind) => {
            const selected = value.kind === kind
            return (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={selected}
                // Đổi tab thì bỏ luôn danh mục đang chọn: danh mục cũ có thể
                // thuộc kind khác, giữ lại sẽ ra danh sách rỗng mà không rõ vì sao.
                onClick={() => onChange({ ...value, kind, categoryId: 'all' })}
                className="rounded-[9px] px-2.5 py-1 text-[12px] font-extrabold transition-transform duration-150 active:scale-95"
                style={{
                  background: selected ? theme.accent : 'transparent',
                  color: selected ? '#fff' : theme.muted,
                }}
              >
                {kindLabel[kind]}
              </button>
            )
          })}
        </div>

        <div className="min-w-[140px] flex-1">
          <Select
            items={categoryOptions}
            value={value.categoryId}
            onValueChange={(v) => onChange({ ...value, categoryId: v ?? 'all' })}
          >
            <SelectTrigger className="h-9 w-full" style={inputStyle} aria-label={t.expenseCategory}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
            >
              {categoryOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} label={o.label}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {active && (
          <button
            type="button"
            onClick={() => onChange({ query: '', kind: 'all', categoryId: 'all' })}
            className="flex h-9 items-center gap-1.5 rounded-[11px] border-[1.5px] px-2.5 text-[12px] font-bold transition-transform duration-150 active:scale-95"
            style={{ borderColor: theme.border, background: theme.chip, color: theme.muted }}
          >
            <XIcon className="size-3.5" />
            {t.filterClear}
            <span className="tabular-nums">({resultCount})</span>
          </button>
        )}
      </div>
    </div>
  )
}
