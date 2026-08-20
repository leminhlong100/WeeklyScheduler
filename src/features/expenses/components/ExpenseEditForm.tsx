import { useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
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
import type { ExpenseKind } from '@/lib/supabase/database.types'
import {
  expenseSchema,
  parseAmount,
  CURRENCIES,
  DEFAULT_CURRENCY,
  KINDS,
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
import { statusForDate } from '../utils/status'
import { NO_CATEGORY } from '../utils/draft'
import type { Expense } from '../api/expensesApi'

const INCOME_COLOR = '#2fc39a'

interface ExpenseEditFormProps {
  expense?: Expense
  /** Ngày điền sẵn cho khoản mới — thường là ngày đang xem. */
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
      kind: expense?.kind ?? 'expense',
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

  // useWatch chứ không phải form.watch: form.watch trả về một hàm không memo hoá
  // được, React Compiler thấy vậy là bỏ luôn việc memo cả component này.
  const kind = useWatch({ control, name: 'kind' })
  const repeatMonths = useWatch({ control, name: 'repeatMonths' })

  // Danh mục thu và danh mục chi tách hẳn, nên bộ chọn chỉ hiện nhóm khớp kind
  // đang chọn — tránh gán "Lương" cho một khoản chi.
  const categoryOptions = [
    { value: NO_CATEGORY, label: t.expenseUncategorized },
    ...categories
      .filter((c) => c.kind === kind)
      .map((c) => ({
        value: c.id,
        label: `${c.emoji} ${translateExpenseCategoryName(c.name, t)}`,
      })),
  ]

  const kindLabel: Record<ExpenseKind, string> = {
    expense: t.expenseKindExpense,
    income: t.expenseKindIncome,
  }

  const repeatOptions = REPEAT_MONTH_OPTIONS.map((n) => ({
    value: n,
    label: n === 1 ? t.expenseRepeatNone : t.expenseRepeatMonths.replace('{n}', String(n)),
  }))

  const onSubmit = async (values: ExpenseFormInput) => {
    // Không đưa `status` vào đây: mỗi kỳ giữ trạng thái đã trả / chưa trả của
    // riêng nó, một bản vá chung cho cả chuỗi sẽ ghi đè hết.
    const shared = {
      amount: parseAmount(values.amount),
      currency: values.currency,
      kind: values.kind,
      category_id: values.categoryId === NO_CATEGORY ? null : values.categoryId,
      note: values.note.trim(),
    }

    try {
      if (isEdit) {
        if (applyToSeries && seriesId) {
          // Bản vá chuỗi đã bao gồm chính kỳ này (nó bắt đầu từ ngày của kỳ
          // này), nên chỉ khi user đổi ngày mới cần thêm một lượt ghi riêng —
          // mỗi kỳ phải giữ ngày của nó, không thể ghi một ngày cho cả chuỗi.
          //
          // Hai lượt ghi này phải `await` tuần tự và nằm trong cùng một try:
          // báo "đã cập nhật" rồi đóng modal khi lượt thứ hai còn chưa xong là
          // nói với người dùng một điều chưa chắc đúng.
          await updateSeries.mutateAsync({
            seriesId,
            fromISO: expense.spent_at,
            patch: shared,
          })
          if (values.spentAt !== expense.spent_at) {
            await updateExpense.mutateAsync({
              id: expense.id,
              patch: { spent_at: values.spentAt },
            })
          }
          toast.success(t.expenseSeriesUpdated)
          onDone()
          return
        }

        await updateExpense.mutateAsync({
          id: expense.id,
          patch: { ...shared, spent_at: values.spentAt },
        })
        toast.success(t.expenseUpdated)
        onDone()
        return
      }

      // `source: 'manual'` phân biệt với các dòng AI tách ra; `raw_text` để trống
      // vì không có câu gốc nào để đối chiếu.
      if (values.repeatMonths > 1) {
        const dates = buildMonthlyRepeatDates(values.spentAt, values.repeatMonths)
        // Chỉ chuỗi thật mới có `series_id`; khoản lẻ để NULL, tránh dựng chuỗi
        // một phần tử rồi phải xử lý riêng ở mọi chỗ.
        const newSeriesId = crypto.randomUUID()
        await bulkCreate.mutateAsync(
          dates.map((spent_at) => ({
            ...shared,
            spent_at,
            // Các kỳ chưa tới vào DB ở trạng thái 'planned': dòng vẫn có thật để
            // sửa/xoá lẻ được, nhưng không bị cộng vào tổng của tháng tương lai
            // như thể đã trả.
            status: statusForDate(spent_at),
            source: 'manual' as const,
            series_id: newSeriesId,
          })),
        )
        toast.success(t.expenseSeriesCreated.replace('{n}', String(dates.length)))
        onDone()
        return
      }

      await createExpense.mutateAsync({
        ...shared,
        spent_at: values.spentAt,
        status: statusForDate(values.spentAt),
        source: 'manual',
      })
      toast.success(t.expenseCreated)
      onDone()
    } catch {
      toast.error(t.somethingWentWrong)
    }
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
      {/* Chi hay Thu là câu hỏi đầu tiên: nó đổi cả danh sách danh mục bên dưới
          và đổi dấu của khoản này trong số dư. */}
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <div
            role="tablist"
            aria-label={t.expenseKind}
            className="flex gap-1 rounded-[14px] border-[1.5px] p-1"
            style={{ borderColor: theme.border, background: theme.chip }}
          >
            {KINDS.map((option) => {
              const selected = field.value === option
              return (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    if (selected) return
                    field.onChange(option)
                    // Danh mục của kind cũ không còn nằm trong danh sách mới, để
                    // lại sẽ là một id vô hình mà bộ chọn không hiển thị được.
                    form.setValue('categoryId', NO_CATEGORY)
                  }}
                  className="flex-1 rounded-[10px] py-1.5 text-[13px] font-extrabold transition-transform duration-150 active:scale-[0.98]"
                  style={{
                    background: selected
                      ? option === 'income'
                        ? INCOME_COLOR
                        : theme.accent
                      : 'transparent',
                    color: selected ? '#fff' : theme.muted,
                  }}
                >
                  {kindLabel[option]}
                </button>
              )
            })}
          </div>
        )}
      />

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

      {!isEdit && repeatMonths > 1 && (
        <p className="text-[11.5px] font-semibold" style={{ color: theme.muted }}>
          {t.expensePlannedHint}
        </p>
      )}

      {isEdit && expense.status === 'planned' && (
        <p className="text-[11.5px] font-semibold" style={{ color: '#b07300' }}>
          {t.expensePlannedEditHint}
        </p>
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

      {/* Dính đáy modal: trên điện thoại, bàn phím ảo mở ra ăn hết chiều cao và
          nút Lưu bị đẩy xuống dưới vùng thấy được — người dùng gõ xong thì không
          còn nút nào để bấm. Sticky giữ nó luôn nằm trong khung. */}
      <div
        className="sticky bottom-0 -mx-5 flex flex-wrap justify-end gap-2 border-t px-5 pb-1 pt-3 sm:-mx-6 sm:px-6"
        style={{ background: theme.modalBg, borderColor: theme.border }}
      >
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
