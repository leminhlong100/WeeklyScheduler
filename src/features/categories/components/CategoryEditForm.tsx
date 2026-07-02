import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { GradientButton } from '@/components/common/GradientButton'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { categorySchema, type CategoryFormInput } from '../schemas/categorySchema'
import { useCreateCategory, useUpdateCategory } from '../hooks/useCategoryMutations'
import type { Category } from '../api/categoriesApi'
import { CATEGORY_COLOR_PRESETS, CATEGORY_EMOJI_PRESETS } from '../data/categoryPresets'
import { CategoryFormFields } from './CategoryFormFields'

interface CategoryEditFormProps {
  category?: Category
  onDone: () => void
}

export function CategoryEditForm({ category, onDone }: CategoryEditFormProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const isEdit = !!category

  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      emoji: category?.emoji ?? CATEGORY_EMOJI_PRESETS[0],
      color: category?.color ?? CATEGORY_COLOR_PRESETS[0],
    },
  })

  const onSubmit = (values: CategoryFormInput) => {
    const onError = () => toast.error(t.somethingWentWrong)

    if (isEdit) {
      updateCategory.mutate(
        { id: category.id, patch: values },
        { onSuccess: () => { toast.success(t.categoryUpdated); onDone() }, onError },
      )
    } else {
      createCategory.mutate(values, {
        onSuccess: () => { toast.success(t.categoryCreated); onDone() },
        onError,
      })
    }
  }

  const isPending = createCategory.isPending || updateCategory.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <CategoryFormFields form={form} />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
        >
          {t.cancel}
        </Button>
        <GradientButton type="submit" disabled={isPending}>
          {t.save}
        </GradientButton>
      </div>
    </form>
  )
}
