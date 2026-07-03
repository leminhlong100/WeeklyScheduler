import { PencilIcon, Trash2Icon } from 'lucide-react'
import { useTheme } from '@/features/theme/ThemeContext'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateCategoryName } from '@/features/i18n/defaultCategoryNames'
import type { Category } from '../api/categoriesApi'

interface CategoryRowProps {
  category: Category
  onEdit: () => void
  onDelete: () => void
}

export function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  return (
    <div
      className="flex items-center gap-3 rounded-2xl border-[1.5px] px-3 py-2.5"
      style={{ borderColor: theme.border, background: theme.chip }}
    >
      <span
        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-base"
        style={{ background: category.color + '33' }}
      >
        {category.emoji}
      </span>
      <span className="flex-1 truncate text-sm font-bold" style={{ color: theme.text }}>
        {translateCategoryName(category.name, t)}
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="grid h-8 w-8 place-items-center rounded-lg"
        style={{ color: theme.muted }}
      >
        <PencilIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-lg"
        style={{ color: theme.danger }}
      >
        <Trash2Icon className="size-4" />
      </button>
    </div>
  )
}
