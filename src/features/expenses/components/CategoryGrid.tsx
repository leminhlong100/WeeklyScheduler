import { useState } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { useTheme } from '@/features/theme/ThemeContext'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { NO_CATEGORY } from '../utils/draft'

const VISIBLE = 7

/**
 * Lưới emoji thay cho dropdown danh mục: một chạm là chọn, ô ≥ 56px. Danh mục
 * dùng nhiều nhất đứng đầu (`categories` đã được xếp sẵn theo lịch sử), nên
 * phần lớn lần ghi không cần bấm "Xem thêm".
 */
export function CategoryGrid({
  categories,
  value,
  onChange,
}: {
  categories: ExpenseCategory[]
  value: string
  onChange: (categoryId: string) => void
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const [expanded, setExpanded] = useState(false)

  // Danh mục đang chọn luôn phải nhìn thấy được, kể cả khi nằm ngoài 7 ô đầu.
  const selectedIndex = categories.findIndex((c) => c.id === value)
  const showAll = expanded || selectedIndex >= VISIBLE
  const shown = showAll ? categories : categories.slice(0, VISIBLE)
  const hiddenCount = categories.length - shown.length

  const cell = (id: string, emoji: string, label: string) => {
    const selected = value === id
    return (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => onChange(id)}
        className="flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] px-1 py-1.5 transition-transform active:scale-95"
        style={{
          borderColor: selected ? theme.accent : theme.border,
          background: selected ? `${theme.accent}22` : theme.chip,
          color: theme.text,
        }}
      >
        <span className="text-[20px] leading-none" aria-hidden>
          {emoji}
        </span>
        <span className="w-full truncate text-center text-[11.5px] font-bold">{label}</span>
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-label={t.expenseCategory} className="grid grid-cols-4 gap-1.5">
      {shown.map((c) => cell(c.id, c.emoji, translateExpenseCategoryName(c.name, t)))}
      {cell(NO_CATEGORY, '❔', t.expenseUncategorized)}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-[60px] flex-col items-center justify-center rounded-[14px] border-[1.5px] border-dashed text-[12px] font-extrabold"
          style={{ borderColor: theme.border, color: theme.accent }}
        >
          +{hiddenCount}
          <span className="text-[11px]">{t.seeAll}</span>
        </button>
      )}
    </div>
  )
}
