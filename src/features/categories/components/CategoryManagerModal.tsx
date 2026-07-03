import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useCategories } from '../hooks/useCategories'
import { useDeleteCategory } from '../hooks/useCategoryMutations'
import type { Category } from '../api/categoriesApi'
import { CategoryRow } from './CategoryRow'
import { CategoryEditForm } from './CategoryEditForm'

interface CategoryManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type EditTarget = Category | 'new' | null

export function CategoryManagerModal({ open, onOpenChange }: CategoryManagerModalProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useCategories()
  const deleteCategory = useDeleteCategory()
  const [editTarget, setEditTarget] = useState<EditTarget>(null)

  const close = () => {
    setEditTarget(null)
    onOpenChange(false)
  }

  const handleDelete = (category: Category) => {
    if (!window.confirm(t.deleteCategoryConfirm)) return
    deleteCategory.mutate(category.id, {
      onSuccess: () => toast.success(t.categoryDeleted),
      onError: () => toast.error(t.somethingWentWrong),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-[26px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[440px] sm:rounded-[26px] sm:p-6"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
          {t.manageCategories}
        </DialogTitle>

        {editTarget !== null ? (
          <CategoryEditForm
            category={editTarget === 'new' ? undefined : editTarget}
            onDone={() => setEditTarget(null)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onEdit={() => setEditTarget(category)}
                  onDelete={() => handleDelete(category)}
                />
              ))}
              {categories.length === 0 && (
                <p className="text-sm font-medium" style={{ color: theme.muted }}>
                  {t.noCategories}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditTarget('new')}
              className="gap-1.5"
              style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
            >
              <PlusIcon className="size-4" />
              {t.addCategory}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
