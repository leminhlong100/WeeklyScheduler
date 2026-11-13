import { useConfirm } from '@/components/common/ConfirmDialog'
import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { describeError } from '@/lib/utils/errorMessage'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useBackToClose } from '@/hooks/useBackToClose'
import { useExpenseCategories } from '../hooks/useExpenseCategories'
import { useDeleteExpenseCategory } from '../hooks/useExpenseCategoryMutations'
import { KINDS } from '../schemas/expenseSchema'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { ExpenseCategoryRow } from './ExpenseCategoryRow'
import { ExpenseCategoryEditForm } from './ExpenseCategoryEditForm'
import { useCurrentLedger } from '../LedgerContext'
import { useBudgetCycleStartDay } from '../hooks/useBudgetCycle'
import { MAX_BUDGET_CYCLE_START_DAY } from '../utils/month'

const CYCLE_DAYS = Array.from({ length: MAX_BUDGET_CYCLE_START_DAY }, (_, i) => i + 1)

/** Ngày bắt đầu kỳ hạn mức — vd. lương về ngày 5 thì kỳ là 5 → 4 tháng sau. */
function BudgetCycleField() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { startDay, setStartDay, saving } = useBudgetCycleStartDay()
  return (
    <div
      className="flex flex-col gap-1.5 rounded-[14px] border-[1.5px] p-3"
      style={{ borderColor: theme.border }}
    >
      <label className="flex items-center justify-between gap-3 text-[13px] font-extrabold">
        <span>{t.budgetCycleStartLabel}</span>
        <select
          value={startDay}
          disabled={saving}
          onChange={(e) => setStartDay(Number(e.target.value))}
          className="min-h-11 rounded-[10px] border-[1.5px] px-3 text-[15px] font-bold tabular-nums"
          style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
        >
          {CYCLE_DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[12px] font-semibold" style={{ color: theme.mutedText }}>
        {t.budgetCycleStartHint}
      </p>
    </div>
  )
}

interface ExpenseCategoryManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type EditTarget = ExpenseCategory | 'new' | null

export function ExpenseCategoryManagerModal({
  open,
  onOpenChange,
}: ExpenseCategoryManagerModalProps) {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const { theme } = useTheme()
  const { data: categories = [] } = useExpenseCategories()
  const deleteCategory = useDeleteExpenseCategory()
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const { ledgerId } = useCurrentLedger()

  const close = () => {
    setEditTarget(null)
    onOpenChange(false)
  }
  useBackToClose(open, close)

  const handleDelete = async (category: ExpenseCategory) => {
    // Câu xác nhận nói rõ khoản chi KHÔNG mất: `on delete set null` chỉ gỡ nhãn.
    // Người dùng đang giữ vài trăm dòng tiền sẽ không dám bấm nếu không biết điều đó.
    if (!(await confirm({ message: t.deleteExpenseCategoryConfirm }))) return
    deleteCategory.mutate(category.id, {
      onSuccess: () => toast.success(t.categoryDeleted),
      onError: (error) => toast.error(describeError(t, error)),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-[26px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[440px] sm:rounded-[26px] sm:p-6"
        style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
      >
        <DialogTitle className="font-heading text-xl font-extrabold" style={{ color: theme.text }}>
          {t.manageExpenseCategories}
        </DialogTitle>

        {editTarget !== null ? (
          <ExpenseCategoryEditForm
            // Remount khi đổi mục tiêu, nếu không react-hook-form giữ nguyên
            // defaultValues của lần mở trước.
            key={editTarget === 'new' ? 'new' : editTarget.id}
            category={editTarget === 'new' ? undefined : editTarget}
            onDone={() => setEditTarget(null)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Tách hai nhóm bằng tiêu đề: danh mục thu và danh mục chi không
                dùng lẫn được, trộn một danh sách thì phải đọc từng cái mới biết
                cái nào dùng cho việc gì. */}
            <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto">
              {KINDS.map((kind) => {
                const group = categories.filter((c) => c.kind === kind)
                if (group.length === 0) return null
                return (
                  <div key={kind} className="flex flex-col gap-2">
                    <div
                      className="text-[11px] font-extrabold uppercase tracking-wider"
                      style={{ color: theme.mutedText }}
                    >
                      {kind === 'expense' ? t.expenseKindExpense : t.expenseKindIncome}
                    </div>
                    {group.map((category) => (
                      <ExpenseCategoryRow
                        key={category.id}
                        category={category}
                        onEdit={() => setEditTarget(category)}
                        onDelete={() => handleDelete(category)}
                      />
                    ))}
                  </div>
                )
              })}
              {categories.length === 0 && (
                <p className="text-sm font-medium" style={{ color: theme.mutedText }}>
                  {t.noCategories}
                </p>
              )}
            </div>
            {/* Hạn mức là của sổ cá nhân (sổ chung xem số dư quỹ), nên kỳ của
                nó cũng chỉ chỉnh ở đây. */}
            {ledgerId === null && <BudgetCycleField />}
            <Button
              size="touch"
              type="button"
              variant="outline"
              onClick={() => setEditTarget('new')}
              className="gap-1.5"
              style={{ background: 'transparent', borderColor: theme.border, color: theme.text }}
            >
              <PlusIcon className="size-4" />
              {t.addExpenseCategory}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
