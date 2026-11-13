import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/form/FormField'
import { MoneyInput } from '@/components/form/MoneyInput'
import { ColorSwatches } from '@/components/form/ColorSwatches'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateFieldError } from '@/lib/utils/formErrors'
import { DEFAULT_CURRENCY, KINDS } from '../schemas/expenseSchema'
import type { ExpenseCategoryFormInput } from '../schemas/expenseCategorySchema'
import { EXPENSE_COLOR_PRESETS, EXPENSE_EMOJI_PRESETS } from '../data/expenseCategoryPresets'

/**
 * Emoji (grapheme) cuối cùng trong chuỗi, bỏ khoảng trắng. Cắt theo grapheme chứ
 * không theo code point: emoji ghép như 👨‍👩‍👧 hay 🇻🇳 gồm nhiều code point, cắt
 * theo code point sẽ chặt vỡ chúng.
 */
function lastGrapheme(value: string): string {
  const text = value.trim()
  if (!text) return ''
  const parts = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)]
  // Chỉ nhận emoji/cờ: gõ chữ thường hay số vào ô này không được biến thành icon.
  const emojiPart = parts
    .reverse()
    .find((p) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(p.segment))
  return emojiPart?.segment ?? ''
}

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
                  background: selected ? theme.accentFill : 'transparent',
                  color: selected ? theme.onAccent : theme.mutedText,
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
          <Controller
            control={form.control}
            name="monthlyBudget"
            render={({ field }) => (
              <MoneyInput
                id="expenseCategoryBudget"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                currency={DEFAULT_CURRENCY}
                invalid={!!errors.monthlyBudget}
                placeholder={t.expenseBudgetPh}
                style={inputStyle}
              />
            )}
          />
        </FormField>
      )}

      <div>
        <div className="mb-2 text-xs font-extrabold" style={{ color: theme.mutedText }}>
          {t.categoryEmoji}
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
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
        {/* Ngoài bộ có sẵn: gõ hoặc dán một emoji bất kỳ (bàn phím emoji của máy).
            Chỉ giữ ký tự cuối cùng vừa gõ, nên gõ thêm một emoji là thay luôn emoji
            cũ chứ không nối đuôi. */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className="grid size-10 flex-shrink-0 place-items-center rounded-xl border-[1.5px] text-xl"
            style={{ borderColor: theme.accent, background: theme.chip }}
          >
            {emoji}
          </span>
          <Input
            aria-label={t.categoryEmoji}
            placeholder={t.categoryEmojiCustomPh}
            value=""
            onChange={(e) => {
              const last = lastGrapheme(e.target.value)
              if (last) setValue('emoji', last, { shouldValidate: true })
            }}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-extrabold" style={{ color: theme.mutedText }}>
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
