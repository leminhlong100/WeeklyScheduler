import { useMemo } from 'react'
import { Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { describeError } from '@/lib/utils/errorMessage'
import { GradientButton } from '@/components/common/GradientButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/form/MoneyInput'
import { translateFieldError } from '@/lib/utils/formErrors'
import { formatSignedMoney } from '@/lib/utils/formatMoney'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import type { Currency, ExpenseKind } from '@/lib/supabase/database.types'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useBulkCreateExpenses } from '../hooks/useExpenseMutations'
import { useUndoableActions } from '../hooks/useUndoableActions'
import { amountErrorKey, parseAmount, CURRENCIES, KINDS } from '../schemas/expenseSchema'
import { statusForDate } from '../utils/status'
import { NO_CATEGORY, type DraftRow, type ExpenseDraft } from '../utils/draft'

interface ParsedDraftListProps {
  draft: ExpenseDraft
  /** Mọi thay đổi đi ngược lên trang để được lưu qua `sessionStorage`. */
  onChange: (rows: DraftRow[]) => void
  onDone: () => void
  /** Sau khi lưu xong; mặc định giống onDone. */
  onSaved?: () => void
}

export function ParsedDraftList({ draft, onChange, onDone, onSaved }: ParsedDraftListProps) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useExpenseCategories()
  const bulkCreate = useBulkCreateExpenses()
  const { announceCreated } = useUndoableActions()

  const rows = draft.rows

  // Khoá gồm cả kind: tên danh mục chỉ unique trong phạm vi một kind, nên "Đầu
  // tư" có thể tồn tại ở cả hai bên.
  const categoryIdByKindName = useMemo(
    () => new Map(categories.map((c) => [`${c.kind}|${c.name}`, c.id] as const)),
    [categories],
  )

  /**
   * Danh mục đang áp cho một dòng: ưu tiên lựa chọn tay, không có thì tra tên AI
   * trả về. Tra lúc render nên danh mục fetch xong muộn (sau một lần reload) vẫn
   * khớp được, thay vì đóng băng thành "chưa phân loại".
   */
  const resolveCategoryId = (row: DraftRow): string =>
    row.categoryId ?? categoryIdByKindName.get(`${row.kind}|${row.aiCategory}`) ?? NO_CATEGORY

  const optionsForKind = (kind: ExpenseKind) => [
    { value: NO_CATEGORY, label: t.expenseUncategorized },
    ...categories
      .filter((c) => c.kind === kind)
      .map((c) => ({
        value: c.id,
        label: `${c.emoji} ${translateExpenseCategoryName(c.name, t)}`,
      })),
  ]

  const patchRow = (key: string, patch: Partial<DraftRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const removeRow = (key: string) => onChange(rows.filter((r) => r.key !== key))

  const hasInvalidAmount = rows.some((r) => amountErrorKey(r.amount, r.currency) !== null)
  // Nút Lưu không bị khoá câm khi có dòng lỗi: bấm thì cuộn tới dòng lỗi đầu
  // tiên (đã tô đỏ + ghi lý do), thay vì một nút xám không nói vì sao.
  const canSave = rows.length > 0 && !bulkCreate.isPending

  // Tổng của bản nháp theo từng tiền tệ, chỉ các dòng đọc được số tiền.
  const totals = new Map<Currency, number>()
  for (const r of rows) {
    if (amountErrorKey(r.amount, r.currency) !== null) continue
    const v = parseAmount(r.amount, r.currency) * (r.kind === 'income' ? 1 : -1)
    totals.set(r.currency, Math.round(((totals.get(r.currency) ?? 0) + v) * 100) / 100)
  }
  const totalText = [...totals].map(([c, v]) => formatSignedMoney(v, c, locale, 'auto')).join(' · ')

  const saveAll = () => {
    if (!canSave) return
    if (hasInvalidAmount) {
      document
        .querySelector('[data-draft-invalid="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    bulkCreate.mutate(
      rows.map((r) => {
        const categoryId = resolveCategoryId(r)
        return {
          amount: parseAmount(r.amount, r.currency),
          currency: r.currency,
          kind: r.kind,
          category_id: categoryId === NO_CATEGORY ? null : categoryId,
          note: r.note.trim(),
          spent_at: r.spentAt,
          // Cùng quy tắc với form nhập tay: ngày ở tương lai thì là kỳ dự kiến.
          status: statusForDate(r.spentAt),
          source: 'ai' as const,
          raw_text: draft.rawText,
        }
      }),
      {
        onSuccess: (created) => {
          announceCreated(t.expensesSavedCount.replace('{n}', String(created.length)), created)
          ;(onSaved ?? onDone)()
        },
        onError: (error) => toast.error(describeError(t, error, { network: t.errNetworkNotSaved })),
      },
    )
  }

  const inputStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text }
  const contentStyle = { background: theme.modalBg, borderColor: theme.border, color: theme.text }
  const kindLabel: Record<ExpenseKind, string> = {
    expense: t.expenseKindExpense,
    income: t.expenseKindIncome,
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border-[1.5px] p-3.5"
      style={{ borderColor: theme.accent, background: theme.chip }}
    >
      <div>
        <div className="font-heading text-[15px] font-extrabold" style={{ color: theme.text }}>
          {t.draftTitle}
        </div>
        <p className="text-[11.5px] font-semibold" style={{ color: theme.mutedText }}>
          {t.draftHint}
        </p>
      </div>

      {/* Câu gốc để đối chiếu từng dòng AI tách ra. */}
      <blockquote
        className="rounded-xl border-l-4 px-3 py-2 text-[13px] font-semibold italic"
        style={{ borderColor: theme.accent, background: theme.inputBg, color: theme.text }}
      >
        “{draft.rawText}”
      </blockquote>

      {rows.length > 0 && (
        <div className="flex items-baseline justify-between gap-2 px-1 text-[13px] font-extrabold">
          <span style={{ color: theme.mutedText }}>
            {t.draftCount.replace('{n}', String(rows.length))}
          </span>
          <span className="tabular-nums" style={{ color: theme.text }}>
            {totalText}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const categoryOptions = optionsForKind(row.kind)
          const categoryValue = resolveCategoryId(row)
          const amountError = amountErrorKey(row.amount, row.currency)
          return (
            <div
              key={row.key}
              data-draft-invalid={amountError !== null}
              className="flex flex-col gap-2 rounded-xl border-[1.5px] p-2.5"
              style={{
                // Nền cảnh báo nhẹ cho dòng AI không chắc — đủ để mắt dừng lại,
                // không đủ để trông như lỗi. Dòng có số tiền sai thì viền đỏ.
                borderColor:
                  amountError !== null
                    ? theme.danger
                    : row.confidence === 'low'
                      ? theme.warning
                      : theme.border,
                background: row.confidence === 'low' ? theme.warningBg : theme.inputBg,
              }}
            >
              {row.confidence === 'low' && (
                <div
                  className="flex items-center gap-1.5 text-[11px] font-bold"
                  style={{ color: theme.warning }}
                >
                  <TriangleAlertIcon className="size-3.5 flex-shrink-0" />
                  {t.draftLowConfidence}
                </div>
              )}

              {/* Chi/Thu sửa được ngay trên dòng: AI đoán sai chiều tiền là lỗi
                  đắt nhất ở đây — nó lật dấu của khoản này trong số dư. */}
              <div
                role="radiogroup"
                aria-label={t.expenseKind}
                className="flex gap-1 self-start rounded-[11px] border-[1.5px] p-0.5"
                style={{ borderColor: theme.border, background: theme.chip }}
              >
                {KINDS.map((option) => {
                  const selected = row.kind === option
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        if (selected) return
                        // Danh mục cũ thuộc kind khác nên không còn dùng được;
                        // ép về "chưa phân loại" để không giữ một id vô hình.
                        patchRow(row.key, { kind: option, categoryId: NO_CATEGORY })
                      }}
                      className="min-h-11 rounded-[8px] px-3 sm:min-h-9 py-1 text-[12px] font-extrabold"
                      style={{
                        background: selected
                          ? option === 'income'
                            ? theme.income
                            : theme.accentFill
                          : 'transparent',
                        color: selected
                          ? option === 'income'
                            ? theme.onIncome
                            : theme.onAccent
                          : theme.mutedText,
                      }}
                    >
                      {kindLabel[option]}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <MoneyInput
                    aria-label={t.expenseAmount}
                    value={row.amount}
                    onChange={(next) => patchRow(row.key, { amount: next })}
                    currency={row.currency}
                    size="sm"
                    invalid={amountError !== null}
                    style={inputStyle}
                  />
                </div>
                <Select
                  items={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  value={row.currency}
                  onValueChange={(v) => patchRow(row.key, { currency: v as Currency })}
                >
                  <SelectTrigger
                    className="h-11 w-[88px] sm:h-9"
                    style={inputStyle}
                    aria-label={t.expenseCurrency}
                  >
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
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={t.delete}
                  className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg transition-transform duration-150 active:scale-95 sm:h-9 sm:w-9"
                  style={{ color: theme.mutedText }}
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
              {amountError && (
                <p className="text-xs font-bold" style={{ color: theme.danger }}>
                  {translateFieldError(t, amountError)}
                </p>
              )}

              <Input
                aria-label={t.expenseNote}
                value={row.note}
                placeholder={t.expenseNotePh}
                onChange={(e) => patchRow(row.key, { note: e.target.value })}
                className="h-11 sm:h-9"
                style={inputStyle}
              />

              <div className="flex gap-2">
                <Select
                  items={categoryOptions}
                  value={categoryValue}
                  onValueChange={(v) => patchRow(row.key, { categoryId: v ?? NO_CATEGORY })}
                >
                  <SelectTrigger
                    className="h-11 min-w-0 flex-1 sm:h-9"
                    style={inputStyle}
                    aria-label={t.expenseCategory}
                  >
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
                <Input
                  type="date"
                  aria-label={t.expenseDate}
                  value={row.spentAt}
                  onChange={(e) => patchRow(row.key, { spentAt: e.target.value })}
                  className="h-11 w-[150px] sm:h-9"
                  style={inputStyle}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          className="h-11 sm:h-9"
          style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
        >
          {t.draftDiscard}
        </Button>
        {/* Disable ngay khi bấm (isPending) — insert hàng loạt hai lần sẽ nhân đôi
            toàn bộ khoản chi và người dùng phải xoá tay từng dòng. */}
        <GradientButton
          type="button"
          onClick={saveAll}
          disabled={!canSave}
          className="h-11 min-w-[140px] flex-1 sm:h-9 sm:flex-none"
        >
          {t.saveAll}
        </GradientButton>
      </div>
    </section>
  )
}
