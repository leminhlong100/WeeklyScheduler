import { mixColors, rgba } from '@/lib/utils/color'
import type { Category } from '@/features/categories/api/categoriesApi'
import type { DerivedTheme } from '@/features/theme/types'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateCategoryName } from '@/features/i18n/defaultCategoryNames'

interface TaskCategoryChipsProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
  theme: DerivedTheme
}

export function TaskCategoryChips({ categories, selectedId, onSelect, theme }: TaskCategoryChipsProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((category) => {
        const selected = category.id === selectedId
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className="flex items-center gap-1.5 rounded-xl border-[1.5px] px-3 py-2 text-[12.5px] font-bold"
            style={{
              borderColor: selected ? category.color : theme.border,
              background: selected ? rgba(category.color, 0.14) : 'transparent',
              color: selected ? mixColors(category.color, '#000000', 0.12) : theme.muted,
            }}
          >
            <span className="text-sm">{category.emoji}</span>
            {translateCategoryName(category.name, t)}
          </button>
        )
      })}
    </div>
  )
}
