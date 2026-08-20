import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { GradientButton } from '@/components/common/GradientButton'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import {
  expenseCategorySchema,
  parseBudget,
  type ExpenseCategoryFormInput,
} from '../schemas/expenseCategorySchema'
import { EXPENSE_COLOR_PRESETS, EXPENSE_EMOJI_PRESETS } from '../data/expenseCategoryPresets'
import {
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
} from '../hooks/useExpenseCategoryMutations'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { ExpenseCategoryFormFields } from './ExpenseCategoryFormFields'

interface ExpenseCategoryEditFormProps {
  category?: ExpenseCategory
  onDone: () => void
}

export function ExpenseCategoryEditForm({ category, onDone }: ExpenseCategoryEditFormProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const createCategory = useCreateExpenseCategory()
  const updateCategory = useUpdateExpenseCategory()
  const isEdit = !!category

  const form = useForm<ExpenseCategoryFormInput>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: {
      // Tên THÔ trong DB, không phải bản đã dịch: bản dịch chỉ là lớp hiển thị
      // cho 7 danh mục seed, ghi đè bằng nó sẽ khoá danh mục vào một ngôn ngữ.
      name: category?.name ?? '',
      emoji: category?.emoji ?? EXPENSE_EMOJI_PRESETS[0],
      color: category?.color ?? EXPENSE_COLOR_PRESETS[0],
      kind: category?.kind ?? 'expense',
      monthlyBudget: category?.monthly_budget != null ? String(category.monthly_budget) : '',
    },
  })

  const onSubmit = (values: ExpenseCategoryFormInput) => {
    const onError = () => toast.error(t.somethingWentWrong)
    const patch = {
      name: values.name.trim(),
      emoji: values.emoji,
      color: values.color,
      kind: values.kind,
      // Danh mục thu không có ô hạn mức, nên bất kể form còn giữ giá trị gì thì
      // cột này phải về NULL — không để lại một hạn mức vô hình không ai thấy.
      monthly_budget: values.kind === 'expense' ? parseBudget(values.monthlyBudget) : null,
    }

    if (isEdit) {
      updateCategory.mutate(
        { id: category.id, patch },
        {
          onSuccess: () => {
            toast.success(t.categoryUpdated)
            onDone()
          },
          onError,
        },
      )
    } else {
      createCategory.mutate(patch, {
        onSuccess: () => {
          toast.success(t.categoryCreated)
          onDone()
        },
        onError,
      })
    }
  }

  const isPending = createCategory.isPending || updateCategory.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <ExpenseCategoryFormFields form={form} allowKindChange={!isEdit} />
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
