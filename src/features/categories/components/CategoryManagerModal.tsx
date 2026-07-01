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
        className="max-w-[440px] rounded-[26px] border-[1.5px] p-6"
        style={{ background: theme.modalBg, borderColor: theme.border }}
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
            <Button type="button" variant="outline" onClick={() => setEditTarget('new')} className="gap-1.5">
              <PlusIcon className="size-4" />
              {t.addCategory}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
