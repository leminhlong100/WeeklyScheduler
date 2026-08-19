import { useMemo, useState } from 'react'
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
import type { Currency } from '@/lib/supabase/database.types'
import type { ParsedExpenseItem } from '../api/parseExpenseApi'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useBulkCreateExpenses } from '../hooks/useExpenseMutations'
import { parseAmount, CURRENCIES } from '../schemas/expenseSchema'

const NO_CATEGORY = '__none__'

interface DraftRow {
  /** Khoá ổn định để React không nhầm dòng khi xoá dòng ở giữa. */
  key: string
  amount: string
  currency: Currency
  categoryId: string
  note: string
  spentAt: string
  confidence: 'high' | 'low'
}

function toDraftRows(
  items: ParsedExpenseItem[],
  categoryIdByName: Map<string, string>,
): DraftRow[] {
  return items.map((item, index) => ({
    key: `${index}`,
    amount: String(item.amount),
    currency: item.currency,
    // AI trả về TÊN danh mục (nó không biết uuid). Không khớp được tên nào thì
    // để trống thay vì đoán — user chọn lại nhanh hơn là phát hiện chọn sai.
    categoryId: categoryIdByName.get(item.category) ?? NO_CATEGORY,
    note: item.note,
    spentAt: item.spent_at,
    confidence: item.confidence,
  }))
}

interface ParsedDraftListProps {
  items: ParsedExpenseItem[]
  /** Câu gốc — lưu vào `raw_text` để sửa lại được khi AI parse sai. */
  rawText: string
  onDone: () => void
}

export function ParsedDraftList({ items, rawText, onDone }: ParsedDraftListProps) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: categories = [] } = useExpenseCategories()
  const bulkCreate = useBulkCreateExpenses()

  const categoryIdByName = useMemo(
    () => new Map(categories.map((c) => [c.name, c.id] as const)),
    [categories],
  )
  const [rows, setRows] = useState<DraftRow[]>(() => toDraftRows(items, categoryIdByName))

  const categoryOptions = [
    { value: NO_CATEGORY, label: t.expenseUncategorized },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.emoji} ${translateExpenseCategoryName(c.name, t)}`,
    })),
  ]

  const patchRow = (key: string, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key))

  const hasInvalidAmount = rows.some((r) => !(Number(r.amount) > 0))
  const canSave = rows.length > 0 && !hasInvalidAmount && !bulkCreate.isPending

  const saveAll = () => {
    if (!canSave) return
    bulkCreate.mutate(
      rows.map((r) => ({
        amount: parseAmount(r.amount),
        currency: r.currency,
        category_id: r.categoryId === NO_CATEGORY ? null : r.categoryId,
        note: r.note.trim(),
        spent_at: r.spentAt,
        source: 'ai' as const,
        raw_text: rawText,
      })),
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
        {rows.map((row) => (
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
                value={row.categoryId}
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
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
        >
          {t.draftDiscard}
        </Button>
        {/* Disable ngay khi bấm (isPending) — insert hàng loạt hai lần sẽ nhân đôi
            toàn bộ khoản chi và người dùng phải xoá tay từng dòng. */}
        <GradientButton type="button" onClick={saveAll} disabled={!canSave}>
          {t.saveAll}
        </GradientButton>
      </div>
    </section>
  )
}
