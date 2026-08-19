import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RepeatIcon } from 'lucide-react'
import { toast } from 'sonner'
import { GradientButton } from '@/components/common/GradientButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/form/FormField'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { translateFieldError } from '@/lib/utils/formErrors'
import { todayISO } from '@/lib/utils/date'
import {
  expenseSchema,
  parseAmount,
  CURRENCIES,
  DEFAULT_CURRENCY,
  REPEAT_MONTH_OPTIONS,
  type ExpenseFormInput,
} from '../schemas/expenseSchema'
import {
  useBulkCreateExpenses,
  useCreateExpense,
  useDeleteExpenseSeries,
  useUpdateExpense,
  useUpdateExpenseSeries,
} from '../hooks/useExpenseMutations'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { buildMonthlyRepeatDates } from '../utils/month'
import type { Expense } from '../api/expensesApi'

/**
 * `<Select>` không có khái niệm "không chọn gì" — value rỗng làm nó rơi về
 * placeholder và không gửi được. Dùng một sentinel để "Chưa phân loại" là một
 * lựa chọn thật, rồi ánh xạ về NULL khi ghi DB.
 */
const NO_CATEGORY = '__none__'

interface ExpenseEditFormProps {
  expense?: Expense
  /** Ngày điền sẵn cho khoản chi mới — thường là ngày đang xem. */
  defaultDate?: string
  onDone: () => void
}

export function ExpenseEditForm({ expense, defaultDate, onDone }: ExpenseEditFormProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useExpenseCategories()
  const createExpense = useCreateExpense()
  const bulkCreate = useBulkCreateExpenses()
  const updateExpense = useUpdateExpense()
  const updateSeries = useUpdateExpenseSeries()
  const deleteSeries = useDeleteExpenseSeries()
  const isEdit = !!expense
  const seriesId = expense?.series_id ?? null

  const [applyToSeries, setApplyToSeries] = useState(false)

  const form = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense ? String(expense.amount) : '',
      currency: expense?.currency ?? DEFAULT_CURRENCY,
      categoryId: expense?.category_id ?? NO_CATEGORY,
      note: expense?.note ?? '',
      spentAt: expense?.spent_at ?? defaultDate ?? todayISO(),
      repeatMonths: 1,
    },
  })
  const {
    register,
    control,
    formState: { errors },
  } = form

  const categoryOptions = [
    { value: NO_CATEGORY, label: t.expenseUncategorized },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.emoji} ${translateExpenseCategoryName(c.name, t)}`,
    })),
  ]

  const repeatOptions = REPEAT_MONTH_OPTIONS.map((n) => ({
    value: n,
    label: n === 1 ? t.expenseRepeatNone : t.expenseRepeatMonths.replace('{n}', String(n)),
  }))

  const onSubmit = (values: ExpenseFormInput) => {
    const onError = () => toast.error(t.somethingWentWrong)
    const shared = {
      amount: parseAmount(values.amount),
      currency: values.currency,
      category_id: values.categoryId === NO_CATEGORY ? null : values.categoryId,
      note: values.note.trim(),
    }

    if (isEdit) {
      if (applyToSeries && seriesId) {
        // Bản vá chuỗi đã bao gồm chính kỳ này (nó bắt đầu từ ngày của kỳ này),
        // nên chỉ khi user đổi ngày mới cần thêm một lượt ghi riêng — mỗi kỳ
        // phải giữ ngày của nó, không thể ghi một ngày cho cả chuỗi.
        updateSeries.mutate(
          { seriesId, fromISO: expense.spent_at, patch: shared },
          {
            onSuccess: () => {
              if (values.spentAt !== expense.spent_at) {
                updateExpense.mutate({ id: expense.id, patch: { spent_at: values.spentAt } })
              }
              toast.success(t.expenseSeriesUpdated)
              onDone()
            },
            onError,
          },
        )
        return
      }

      updateExpense.mutate(
        { id: expense.id, patch: { ...shared, spent_at: values.spentAt } },
        {
          onSuccess: () => {
            toast.success(t.expenseUpdated)
            onDone()
          },
          onError,
        },
      )
      return
    }

    // `source: 'manual'` phân biệt với các dòng AI tách ra; `raw_text` để trống
    // vì không có câu gốc nào để đối chiếu.
    if (values.repeatMonths > 1) {
      const dates = buildMonthlyRepeatDates(values.spentAt, values.repeatMonths)
      // Chỉ chuỗi thật mới có `series_id`; khoản lẻ để NULL, tránh dựng chuỗi
      // một phần tử rồi phải xử lý riêng ở mọi chỗ.
      const newSeriesId = crypto.randomUUID()
      bulkCreate.mutate(
        dates.map((spent_at) => ({
          ...shared,
          spent_at,
          source: 'manual' as const,
          series_id: newSeriesId,
        })),
        {
          onSuccess: () => {
            toast.success(t.expenseSeriesCreated.replace('{n}', String(dates.length)))
            onDone()
          },
          onError,
        },
      )
      return
    }

    createExpense.mutate(
      { ...shared, spent_at: values.spentAt, source: 'manual' },
      {
        onSuccess: () => {
          toast.success(t.expenseCreated)
          onDone()
        },
        onError,
      },
    )
  }

  const handleDeleteSeries = () => {
    if (!expense || !seriesId) return
    if (!window.confirm(t.deleteExpenseSeriesConfirm)) return
    deleteSeries.mutate(
      { seriesId, fromISO: expense.spent_at },
      {
        onSuccess: () => {
          toast.success(t.expenseSeriesDeleted)
          onDone()
        },
        onError: () => toast.error(t.somethingWentWrong),
      },
    )
  }

  const isPending =
    createExpense.isPending ||
    bulkCreate.isPending ||
    updateExpense.isPending ||
    updateSeries.isPending ||
    deleteSeries.isPending
  const inputStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text }
  const contentStyle = { background: theme.modalBg, borderColor: theme.border, color: theme.text }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <FormField
            label={t.expenseAmount}
            htmlFor="amount"
            error={translateFieldError(t, errors.amount?.message)}
          >
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              placeholder={t.expenseAmountPh}
              style={inputStyle}
              {...register('amount')}
            />
          </FormField>
        </div>
        <div className="w-[104px] flex-shrink-0">
          <FormField label={t.expenseCurrency} htmlFor="currency">
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  items={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger className="w-full" style={inputStyle}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={contentStyle}>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c} label={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>
      </div>

      <FormField label={t.expenseCategory} htmlFor="categoryId">
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select
              items={categoryOptions}
              value={field.value}
              onValueChange={(v) => field.onChange(v)}
            >
              <SelectTrigger className="w-full" style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={contentStyle}>
                {categoryOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value} label={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        label={t.expenseNote}
        htmlFor="note"
        error={translateFieldError(t, errors.note?.message)}
      >
        <Input id="note" placeholder={t.expenseNotePh} style={inputStyle} {...register('note')} />
      </FormField>

      <FormField
        label={t.expenseDate}
        htmlFor="spentAt"
        error={translateFieldError(t, errors.spentAt?.message)}
      >
        <Input id="spentAt" type="date" style={inputStyle} {...register('spentAt')} />
      </FormField>

      {/* Chỉ hỏi lúc TẠO: mỗi kỳ là một dòng thật, nên đổi độ dài chuỗi lúc sửa
          sẽ là "thêm/xoá bao nhiêu dòng", một câu hỏi khác hẳn. */}
      {!isEdit && (
        <FormField label={t.expenseRepeat} htmlFor="repeatMonths">
          <Controller
            control={control}
            name="repeatMonths"
            render={({ field }) => (
              <Select
                items={repeatOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                value={String(field.value)}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={contentStyle}>
                  {repeatOptions.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)} label={o.label}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      )}

      {isEdit && seriesId && (
        <div className="rounded-2xl px-3.5 py-3" style={{ background: theme.chip }}>
          <div className="flex items-start gap-2">
            <RepeatIcon className="mt-px size-4 flex-shrink-0" style={{ color: theme.muted }} />
            <p className="text-[12.5px] font-semibold" style={{ color: theme.muted }}>
              {t.expenseSeriesNotice}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setApplyToSeries((v) => !v)}
            aria-pressed={applyToSeries}
            className="mt-2.5 flex w-full items-center gap-2.5 text-left"
          >
            <span
              className="flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-150"
              style={{ background: applyToSeries ? theme.accent : theme.border }}
            >
              <span
                className="h-4 w-4 rounded-full bg-white transition-transform duration-150"
                style={{ transform: applyToSeries ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </span>
            <span
              className="text-xs font-extrabold"
              style={{ color: applyToSeries ? theme.text : theme.muted }}
            >
              {t.applyToExpenseSeries}
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {isEdit && seriesId && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDeleteSeries}
            disabled={isPending}
            className="mr-auto"
            style={{
              background: 'transparent',
              borderColor: theme.dangerBorder,
              color: theme.danger,
            }}
          >
            {t.deleteExpenseSeries}
          </Button>
        )}
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
