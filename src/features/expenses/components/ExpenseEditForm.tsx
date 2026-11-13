import { useConfirm } from '@/components/common/ConfirmDialog'
import { useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RepeatIcon } from 'lucide-react'
import { toast } from 'sonner'
import { describeError } from '@/lib/utils/errorMessage'
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
import { MoneyInput } from '@/components/form/MoneyInput'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateFieldError } from '@/lib/utils/formErrors'
import { todayISO } from '@/lib/utils/date'
import dayjs from 'dayjs'
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
import { orderByUsage, readAddPreferences, rememberAddChoice } from '../utils/addPreferences'
import { ledgerCacheKey, useCurrentLedger } from '../LedgerContext'
import { CategoryGrid } from './CategoryGrid'
import { useUndoableActions } from '../hooks/useUndoableActions'
import type { Expense } from '../api/expensesApi'

interface ExpenseEditFormProps {
  expense?: Expense
  /** Ngày điền sẵn cho khoản mới — thường là ngày đang xem. */
  defaultDate?: string
  onDone: () => void
}

const CURRENCY_LABEL = { VND: '₫ VND', JPY: '¥ JPY', USD: '$ USD' } as const

export function ExpenseEditForm({ expense, defaultDate, onDone }: ExpenseEditFormProps) {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const { theme } = useTheme()
  const { data: categories = [] } = useExpenseCategories()
  const createExpense = useCreateExpense()
  const bulkCreate = useBulkCreateExpenses()
  const updateExpense = useUpdateExpense()
  const updateSeries = useUpdateExpenseSeries()
  const deleteSeries = useDeleteExpenseSeries()
  const isEdit = !!expense
  const { announceCreated, deleteWithUndo } = useUndoableActions()
  const seriesId = expense?.series_id ?? null

  const [applyToSeries, setApplyToSeries] = useState(false)
  const { ledgerId } = useCurrentLedger()
  const ledgerKey = ledgerCacheKey(ledgerId)
  // Đọc một lần khi mở form: lựa chọn lần trước làm mặc định cho lần này.
  const [prefs] = useState(() => readAddPreferences(ledgerKey))
  const initialKind = expense?.kind ?? prefs.kind ?? 'expense'

  const form = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense ? String(expense.amount) : '',
      currency: expense?.currency ?? prefs.currency ?? DEFAULT_CURRENCY,
      kind: initialKind,
      categoryId: expense
        ? (expense.category_id ?? NO_CATEGORY)
        : (prefs.lastCategory?.[initialKind] ?? NO_CATEGORY),
      note: expense?.note ?? '',
      spentAt: expense?.spent_at ?? defaultDate ?? todayISO(),
      repeatMonths: 1,
    },
  })
  const {
    register,
    control,
    formState: { errors, isSubmitting },
  } = form

  // useWatch chứ không phải form.watch: form.watch trả về một hàm không memo hoá
  // được, React Compiler thấy vậy là bỏ luôn việc memo cả component này.
  const kind = useWatch({ control, name: 'kind' })
  const repeatMonths = useWatch({ control, name: 'repeatMonths' })
  const currency = useWatch({ control, name: 'currency' })

  // Danh mục thu và danh mục chi tách hẳn, nên lưới chỉ hiện nhóm khớp kind
  // đang chọn — tránh gán "Lương" cho một khoản chi. Hay dùng thì lên đầu.
  const gridCategories = orderByUsage(
    categories.filter((c) => c.kind === kind),
    prefs.history,
  )
  const spentAt = useWatch({ control, name: 'spentAt' })
  const today = todayISO()
  const yesterday = dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')

  const kindLabel: Record<ExpenseKind, string> = {
    expense: t.expenseKindExpense,
    income: t.expenseKindIncome,
  }

  const repeatOptions = REPEAT_MONTH_OPTIONS.map((n) => ({
    value: n,
    label: n === 1 ? t.expenseRepeatNone : t.expenseRepeatMonths.replace('{n}', String(n)),
  }))

  /** `keepOpen`: bấm "Lưu & thêm tiếp" thì giữ form mở cho khoản kế tiếp. */
  const onSubmit = async (values: ExpenseFormInput, keepOpen = false) => {
    // Không đưa `status` vào đây: mỗi kỳ giữ trạng thái đã trả / chưa trả của
    // riêng nó, một bản vá chung cho cả chuỗi sẽ ghi đè hết.
    // Danh mục nhớ từ lần trước có thể đã bị xoá ở thiết bị khác: không gửi một
    // id không còn tồn tại (DB sẽ báo lỗi khoá ngoại).
    const categoryExists = categories.some((c) => c.id === values.categoryId)
    const categoryId =
      values.categoryId === NO_CATEGORY || (categories.length > 0 && !categoryExists)
        ? null
        : values.categoryId
    const shared = {
      amount: parseAmount(values.amount, values.currency),
      currency: values.currency,
      kind: values.kind,
      category_id: categoryId,
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
        toast.success(values.kind === 'income' ? t.incomeUpdated : t.expenseUpdated)
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
        const createdRows = await bulkCreate.mutateAsync(
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
        announceCreated(t.expenseSeriesCreated.replace('{n}', String(dates.length)), createdRows)
        rememberAddChoice(ledgerKey, { currency: values.currency, kind: values.kind, categoryId })
        onDone()
        return
      }

      const created = await createExpense.mutateAsync({
        ...shared,
        spent_at: values.spentAt,
        status: statusForDate(values.spentAt),
        source: 'manual',
      })
      announceCreated(values.kind === 'income' ? t.incomeCreated : t.expenseCreated, [created])
      rememberAddChoice(ledgerKey, { currency: values.currency, kind: values.kind, categoryId })
      if (keepOpen) {
        // Giữ ngày, loại, danh mục, tiền tệ; chỉ xoá số tiền và ghi chú.
        form.reset({ ...values, amount: '', note: '', repeatMonths: 1 })
        form.setFocus('amount')
        return
      }
      onDone()
    } catch (error) {
      toast.error(describeError(t, error))
    }
  }

  const handleDeleteSeries = async () => {
    if (!expense || !seriesId) return
    if (!(await confirm({ message: t.deleteExpenseSeriesConfirm }))) return
    deleteSeries.mutate(
      { seriesId, fromISO: expense.spent_at },
      {
        onSuccess: () => {
          toast.success(t.expenseSeriesDeleted)
          onDone()
        },
        onError: (error) => toast.error(describeError(t, error)),
      },
    )
  }

  const isPending =
    createExpense.isPending ||
    bulkCreate.isPending ||
    updateExpense.isPending ||
    updateSeries.isPending ||
    deleteSeries.isPending ||
    // isPending chỉ bật SAU khi zodResolver (async) chạy xong; chạm đúp nhanh lọt
    // vào khe đó sẽ tạo hai khoản. isSubmitting bật ngay từ lần bấm đầu.
    isSubmitting
  const inputStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text }
  const contentStyle = { background: theme.modalBg, borderColor: theme.border, color: theme.text }

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4"
    >
      {/* Chi hay Thu là câu hỏi đầu tiên: nó đổi cả danh sách danh mục bên dưới
          và đổi dấu của khoản này trong số dư. */}
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <div
            role="radiogroup"
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
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    if (selected) return
                    field.onChange(option)
                    // Danh mục của kind cũ không còn nằm trong danh sách mới, để
                    // lại sẽ là một id vô hình mà bộ chọn không hiển thị được.
                    form.setValue('categoryId', prefs.lastCategory?.[option] ?? NO_CATEGORY)
                  }}
                  className="min-h-11 flex-1 rounded-[10px] py-1.5 text-[14px] font-extrabold sm:min-h-9 transition-transform duration-150 active:scale-[0.98]"
                  style={{
                    background: selected
                      ? option === 'income'
                        ? theme.income
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

      <div className="flex">
        <div className="min-w-0 flex-1">
          <FormField
            label={t.expenseAmount}
            htmlFor="amount"
            error={translateFieldError(t, errors.amount?.message)}
          >
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput
                  id="amount"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  currency={currency}
                  size="lg"
                  showChips
                  // Mở form thêm mới là để gõ số tiền: bật bàn phím số ngay.
                  autoFocus={!isEdit}
                  invalid={!!errors.amount}
                  placeholder={t.expenseAmountPh}
                  style={inputStyle}
                  chipStyle={{
                    borderColor: theme.border,
                    background: theme.chip,
                    color: theme.text,
                  }}
                />
              )}
            />
          </FormField>
        </div>
      </div>

      <Controller
        control={control}
        name="currency"
        render={({ field }) => (
          <div role="radiogroup" aria-label={t.expenseCurrency} className="-mt-1 flex gap-1.5">
            {CURRENCIES.map((c) => {
              const selected = field.value === c
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => field.onChange(c)}
                  className="min-h-11 flex-1 rounded-[12px] border-[1.5px] text-[13px] font-extrabold sm:min-h-9"
                  style={{
                    borderColor: selected ? theme.accent : theme.border,
                    background: selected ? `${theme.accent}22` : 'transparent',
                    color: selected ? theme.text : theme.mutedText,
                  }}
                >
                  {CURRENCY_LABEL[c]}
                </button>
              )
            })}
          </div>
        )}
      />

      <div className="flex flex-col gap-1.5">
        <div className="text-sm font-medium">{t.expenseCategory}</div>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <CategoryGrid
              categories={gridCategories}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <FormField
        label={t.expenseNote}
        htmlFor="note"
        error={translateFieldError(t, errors.note?.message)}
      >
        <Input
          id="note"
          maxLength={200}
          placeholder={t.expenseNotePh}
          style={inputStyle}
          {...register('note')}
        />
      </FormField>

      <FormField
        label={t.expenseDate}
        htmlFor="spentAt"
        error={translateFieldError(t, errors.spentAt?.message)}
      >
        <div className="flex gap-1.5">
          {[
            [today, t.today],
            [yesterday, t.dayYesterday],
          ].map(([iso, label]) => (
            <button
              key={iso}
              type="button"
              aria-pressed={spentAt === iso}
              onClick={() => form.setValue('spentAt', iso, { shouldValidate: true })}
              className="min-h-11 flex-shrink-0 rounded-[12px] border-[1.5px] px-3 text-[13px] font-extrabold sm:min-h-8"
              style={{
                borderColor: spentAt === iso ? theme.accent : theme.border,
                background: spentAt === iso ? `${theme.accent}22` : 'transparent',
                color: spentAt === iso ? theme.text : theme.mutedText,
              }}
            >
              {label}
            </button>
          ))}
          <Input
            id="spentAt"
            type="date"
            className="min-w-0 flex-1"
            style={inputStyle}
            {...register('spentAt')}
          />
        </div>
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
        <p className="text-[11.5px] font-semibold" style={{ color: theme.mutedText }}>
          {t.expensePlannedHint}
        </p>
      )}

      {isEdit && expense.status === 'planned' && (
        <p className="text-[11.5px] font-semibold" style={{ color: theme.warning }}>
          {t.expensePlannedEditHint}
        </p>
      )}

      {isEdit && seriesId && (
        <div className="rounded-2xl px-3.5 py-3" style={{ background: theme.chip }}>
          <div className="flex items-start gap-2">
            <RepeatIcon className="mt-px size-4 flex-shrink-0" style={{ color: theme.mutedText }} />
            <p className="text-[12.5px] font-semibold" style={{ color: theme.mutedText }}>
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
        {isEdit && (
          <Button
            type="button"
            size="touch"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              deleteWithUndo(expense)
              onDone()
            }}
            className={seriesId ? undefined : 'mr-auto'}
            style={{
              background: 'transparent',
              borderColor: theme.dangerBorder,
              color: theme.danger,
            }}
          >
            {t.delete}
          </Button>
        )}
        {isEdit && seriesId && (
          <Button
            size="touch"
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
          size="touch"
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={isPending}
          style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
        >
          {t.cancel}
        </Button>
        {!isEdit && (
          <Button
            type="button"
            size="touch"
            variant="outline"
            disabled={isPending}
            onClick={() => void form.handleSubmit((values) => onSubmit(values, true))()}
            style={{ background: 'transparent', borderColor: theme.accent, color: theme.accent }}
          >
            {t.saveAndAddAnother}
          </Button>
        )}
        <GradientButton type="submit" size="touch" disabled={isPending} className="min-w-[96px]">
          {t.save}
        </GradientButton>
      </div>
    </form>
  )
}
