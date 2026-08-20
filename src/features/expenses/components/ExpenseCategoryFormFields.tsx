import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { ColorSwatches } from '@/components/form/ColorSwatches'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateFieldError } from '@/lib/utils/formErrors'
import { DEFAULT_CURRENCY, KINDS } from '../schemas/expenseSchema'
import type { ExpenseCategoryFormInput } from '../schemas/expenseCategorySchema'
import { EXPENSE_COLOR_PRESETS, EXPENSE_EMOJI_PRESETS } from '../data/expenseCategoryPresets'

/**
 * Tách khỏi `ExpenseCategoryEditForm` theo đúng cặp
 * `CategoryEditForm` / `CategoryFormFields` của danh mục công việc: form giữ
 * `useForm` và phần lưu, còn các ô nhập nằm riêng.
 */
export function ExpenseCategoryFormFields({
  form,
  /**
   * Chỉ cho chọn Chi/Thu lúc TẠO. Đổi kind của danh mục đang dùng sẽ kéo mọi
   * khoản đã gán nó sang phía bên kia của số dư — sửa lại lịch sử tiền bằng một
   * cú bấm, không có cảnh báo nào tương xứng.
   */
  allowKindChange,
}: {
  form: UseFormReturn<ExpenseCategoryFormInput>
  allowKindChange: boolean
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form
  const emoji = watch('emoji')
  const color = watch('color')
  const kind = watch('kind')

  const kindLabel = { expense: t.expenseKindExpense, income: t.expenseKindIncome }
  const inputStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text }

  return (
    <div className="flex flex-col gap-4">
      {allowKindChange && (
        <div
          role="tablist"
          aria-label={t.expenseKind}
          className="flex gap-1 rounded-[14px] border-[1.5px] p-1"
          style={{ borderColor: theme.border, background: theme.chip }}
        >
          {KINDS.map((option) => {
            const selected = kind === option
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setValue('kind', option, { shouldValidate: true })}
                className="flex-1 rounded-[10px] py-1.5 text-[13px] font-extrabold"
                style={{
                  background: selected ? theme.accent : 'transparent',
                  color: selected ? '#fff' : theme.muted,
                }}
              >
                {kindLabel[option]}
              </button>
            )
          })}
        </div>
      )}

      <FormField
        label={t.categoryName}
        htmlFor="expenseCategoryName"
        error={translateFieldError(t, errors.name?.message)}
      >
        <Input
          id="expenseCategoryName"
          placeholder={t.categoryNamePh}
          style={inputStyle}
          {...register('name')}
        />
      </FormField>

      {/* Hạn mức chỉ có nghĩa với khoản CHI — "đừng thu quá 20 triệu" thì không
          phải một mục tiêu ai đặt. Đơn vị ghi thẳng vào nhãn: cột monthly_budget
          không mang currency, nên nếu không nói rõ thì người dùng có thể nhập
          hạn mức bằng yên. */}
      {kind === 'expense' && (
        <FormField
          label={`${t.expenseBudget} (${DEFAULT_CURRENCY})`}
          htmlFor="expenseCategoryBudget"
          error={translateFieldError(t, errors.monthlyBudget?.message)}
        >
          <Input
            id="expenseCategoryBudget"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder={t.expenseBudgetPh}
            style={inputStyle}
            {...register('monthlyBudget')}
          />
        </FormField>
      )}

      <div>
        <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
          {t.categoryEmoji}
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {EXPENSE_EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setValue('emoji', e, { shouldValidate: true })}
              className="grid aspect-square place-items-center rounded-xl border-[1.5px] text-base"
              style={{
                borderColor: emoji === e ? theme.accent : theme.border,
                background: theme.chip,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-extrabold" style={{ color: theme.muted }}>
          {t.categoryColor}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ColorSwatches
            value={color ?? null}
            onChange={(next) => setValue('color', next, { shouldValidate: true })}
            presets={EXPENSE_COLOR_PRESETS}
            ringColor={theme.text}
            customLabel={t.customColor}
          />
        </div>
      </div>
    </div>
  )
}
