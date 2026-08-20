import { useMemo } from 'react'
import { Trash2Icon, TriangleAlertIcon } from 'lucide-react'
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
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import type { Currency, ExpenseKind } from '@/lib/supabase/database.types'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useBulkCreateExpenses } from '../hooks/useExpenseMutations'
import { parseAmount, CURRENCIES, KINDS } from '../schemas/expenseSchema'
import { statusForDate } from '../utils/status'
import { NO_CATEGORY, type DraftRow, type ExpenseDraft } from '../utils/draft'

const INCOME_COLOR = '#2fc39a'

interface ParsedDraftListProps {
  draft: ExpenseDraft
  /** Mọi thay đổi đi ngược lên trang để được lưu qua `sessionStorage`. */
  onChange: (rows: DraftRow[]) => void
  onDone: () => void
}

export function ParsedDraftList({ draft, onChange, onDone }: ParsedDraftListProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useExpenseCategories()
  const bulkCreate = useBulkCreateExpenses()

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

  const hasInvalidAmount = rows.some((r) => !(Number(r.amount) > 0))
  const canSave = rows.length > 0 && !hasInvalidAmount && !bulkCreate.isPending

  const saveAll = () => {
    if (!canSave) return
    bulkCreate.mutate(
      rows.map((r) => {
        const categoryId = resolveCategoryId(r)
        return {
          amount: parseAmount(r.amount),
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
          toast.success(t.expensesSavedCount.replace('{n}', String(created.length)))
          onDone()
        },
        onError: () => toast.error(t.somethingWentWrong),
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
        <p className="text-[11.5px] font-semibold" style={{ color: theme.muted }}>
          {t.draftHint}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const categoryOptions = optionsForKind(row.kind)
          const categoryValue = resolveCategoryId(row)
          return (
            <div
              key={row.key}
              className="flex flex-col gap-2 rounded-xl border-[1.5px] p-2.5"
              style={{
                // Nền cảnh báo nhẹ cho dòng AI không chắc — đủ để mắt dừng lại,
                // không đủ để trông như lỗi.
                borderColor: row.confidence === 'low' ? '#f0b429' : theme.border,
                background: row.confidence === 'low' ? '#f0b4291f' : theme.inputBg,
              }}
            >
              {row.confidence === 'low' && (
                <div
                  className="flex items-center gap-1.5 text-[11px] font-bold"
                  style={{ color: '#b07300' }}
                >
                  <TriangleAlertIcon className="size-3.5 flex-shrink-0" />
                  {t.draftLowConfidence}
                </div>
              )}

              {/* Chi/Thu sửa được ngay trên dòng: AI đoán sai chiều tiền là lỗi
                  đắt nhất ở đây — nó lật dấu của khoản này trong số dư. */}
              <div
                role="tablist"
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
                      role="tab"
                      aria-selected={selected}
                      onClick={() => {
                        if (selected) return
                        // Danh mục cũ thuộc kind khác nên không còn dùng được;
                        // ép về "chưa phân loại" để không giữ một id vô hình.
                        patchRow(row.key, { kind: option, categoryId: NO_CATEGORY })
                      }}
                      className="rounded-[8px] px-2.5 py-1 text-[11.5px] font-extrabold"
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

              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  aria-label={t.expenseAmount}
                  value={row.amount}
                  onChange={(e) => patchRow(row.key, { amount: e.target.value })}
                  className="h-9 flex-1"
                  style={inputStyle}
                />
                <Select
                  items={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  value={row.currency}
                  onValueChange={(v) => patchRow(row.key, { currency: v as Currency })}
                >
                  <SelectTrigger
                    className="h-9 w-[88px]"
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
                  className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg transition-transform duration-150 active:scale-95"
                  style={{ color: theme.muted }}
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>

              <Input
                aria-label={t.expenseNote}
                value={row.note}
                placeholder={t.expenseNotePh}
                onChange={(e) => patchRow(row.key, { note: e.target.value })}
                className="h-9"
                style={inputStyle}
              />

              <div className="flex gap-2">
                <Select
                  items={categoryOptions}
                  value={categoryValue}
                  onValueChange={(v) => patchRow(row.key, { categoryId: v ?? NO_CATEGORY })}
                >
                  <SelectTrigger
                    className="h-9 min-w-0 flex-1"
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
                  className="h-9 w-[150px]"
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
