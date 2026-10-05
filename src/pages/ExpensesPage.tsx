import { useMemo, useState } from 'react'
import { DownloadIcon, EyeIcon, EyeOffIcon, SlidersHorizontalIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIsMobile, useIsTouchDevice } from '@/hooks/useMediaQuery'
import { useSessionStorageState } from '@/hooks/useSessionStorageState'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useAmountVisibility } from '@/features/expenses/AmountVisibilityContext'
import { UserMenu } from '@/features/profile/components/UserMenu'
import { AppShell } from '@/features/layout/components/AppShell'
import { Sidebar } from '@/features/layout/components/Sidebar'
import { ExpensesHeader } from '@/features/expenses/components/ExpensesHeader'
import { ExpenseList } from '@/features/expenses/components/ExpenseList'
import { ExpenseEditForm } from '@/features/expenses/components/ExpenseEditForm'
import { QuickAddSheet } from '@/features/expenses/components/QuickAddSheet'
import { ParsedDraftList } from '@/features/expenses/components/ParsedDraftList'
import { MonthlyReport } from '@/features/expenses/components/MonthlyReport'
import { ExpenseTabs, type ExpenseTab } from '@/features/expenses/components/ExpenseTabs'
import { ExpenseCategoryManagerModal } from '@/features/expenses/components/ExpenseCategoryManagerModal'
import {
  buildExpensesCsv,
  downloadCsv,
  expensesCsvFilename,
} from '@/features/expenses/utils/exportCsv'
import {
  isExpenseDraft,
  toDraftRows,
  type DraftRow,
  type ExpenseDraft,
} from '@/features/expenses/utils/draft'
import {
  EMPTY_EXPENSE_FILTER,
  filterExpenses,
  type ExpenseFilter,
} from '@/features/expenses/utils/filter'
import { useExpensesForMonth } from '@/features/expenses/hooks/useExpenses'
import { useExpenseCategories } from '@/features/expenses/hooks/useExpenseCategories'
import { useDeleteExpense, useUpdateExpense } from '@/features/expenses/hooks/useExpenseMutations'
import type { Expense } from '@/features/expenses/api/expensesApi'
import { todayISO } from '@/lib/utils/date'
import {
  currentMonthKey,
  monthLabelParts,
  monthRange,
  shiftMonth,
} from '@/features/expenses/utils/month'

/** `null` = đóng, `'new'` = thêm mới, một `Expense` = đang sửa dòng đó. */
type EditTarget = Expense | 'new' | null

/**
 * Bản nháp AI nằm trong `sessionStorage`, không chỉ trong state.
 *
 * Một bản nháp đã tốn một lượt gọi AI và thường đã được sửa vài dòng bằng tay.
 * Bấm nhầm sang trang lịch tuần, hay chỉ F5, mà mất sạch thì người dùng phải nói
 * lại từ đầu và tiêu thêm một lượt quota. Khoá đặt tên có tiền tố module để
 * không đụng phần lịch tuần.
 */
const DRAFT_STORAGE_KEY = 'weekly-scheduler:expense-draft'

export function ExpensesPage() {
  const { t, locale, setLocale } = useTranslation()
  const { theme } = useTheme()
  const { hidden: amountsHidden, toggleHidden: toggleAmountsHidden } = useAmountVisibility()
  const isMobile = useIsMobile()
  const isTouch = useIsTouchDevice()

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile && !isTouch)
  const [month, setMonth] = useState(currentMonthKey)
  const [tab, setTab] = useState<ExpenseTab>('list')
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [filter, setFilter] = useState<ExpenseFilter>(EMPTY_EXPENSE_FILTER)
  /** Không có gì được ghi vào DB cho tới khi user bấm lưu bản nháp này. */
  const [draft, setDraft] = useSessionStorageState<ExpenseDraft | null>(
    DRAFT_STORAGE_KEY,
    null,
    isExpenseDraft,
  )

  const { data: expenses = [] } = useExpensesForMonth(month)
  const { data: categories = [] } = useExpenseCategories()
  const deleteExpense = useDeleteExpense()
  const updateExpense = useUpdateExpense()

  const { monthIndex, year } = monthLabelParts(month)
  const monthLabel = `${t.mon[monthIndex]} ${year}`

  const visibleExpenses = useMemo(() => filterExpenses(expenses, filter), [expenses, filter])

  // Đang xem tháng này thì điền hôm nay; xem tháng khác thì điền ngày 1 của
  // tháng đó — nếu cứ điền hôm nay, khoản vừa thêm sẽ rơi ra ngoài danh sách
  // đang mở và trông như bị mất.
  const defaultDateForMonth = month === currentMonthKey() ? todayISO() : monthRange(month).startISO

  const handleExportCsv = () => {
    // Xuất đúng tập đang xem: đã lọc thì file phải khớp với những gì trên màn
    // hình, chứ không âm thầm kèm cả những dòng vừa bị lọc ra.
    if (visibleExpenses.length === 0) {
      toast.error(t.noExpenses)
      return
    }
    downloadCsv(expensesCsvFilename(month), buildExpensesCsv(visibleExpenses, categories, t))
  }

  const handleDelete = (expense: Expense) => {
    if (!window.confirm(t.deleteExpenseConfirm)) return
    deleteExpense.mutate(expense.id, {
      onSuccess: () => toast.success(t.expenseDeleted),
      onError: () => toast.error(t.somethingWentWrong),
    })
  }

  /** Kỳ dự kiến -> đã trả. Từ lúc này nó mới được cộng vào tổng và số dư. */
  const handleMarkPaid = (expense: Expense) => {
    updateExpense.mutate(
      { id: expense.id, patch: { status: 'paid' } },
      {
        onSuccess: () => toast.success(t.expenseMarkedPaid),
        onError: () => toast.error(t.somethingWentWrong),
      },
    )
  }

  return (
    <AppShell
      theme={theme}
      sidebar={
        <Sidebar
          open={sidebarOpen}
          theme={theme}
          t={t}
          locale={locale}
          onLocaleChange={setLocale}
          onClose={() => setSidebarOpen(false)}
        />
      }
      header={
        <ExpensesHeader
          theme={theme}
          t={t}
          monthLabel={monthLabel}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onPrevMonth={() => setMonth((m) => shiftMonth(m, -1))}
          onNextMonth={() => setMonth((m) => shiftMonth(m, 1))}
          onThisMonth={() => setMonth(currentMonthKey())}
          onAddExpense={() => setEditTarget('new')}
          userMenu={<UserMenu />}
        />
      }
    >
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-3 py-4 sm:px-5 sm:py-6">
        {/* Bản nháp thay chỗ ô nhập cho tới khi user quyết định: để cả hai cùng
            lúc thì rất dễ gửi câu thứ hai và mất bản nháp đang sửa dở. */}
        {draft ? (
          <ParsedDraftList
            draft={draft}
            onChange={(rows: DraftRow[]) => setDraft({ ...draft, rows })}
            onDone={() => setDraft(null)}
          />
        ) : (
          <QuickAddSheet
            onDrafts={(items, rawText) => setDraft({ rawText, rows: toDraftRows(items) })}
            onEnterManually={() => setEditTarget('new')}
          />
        )}

        <ExpenseTabs value={tab} onChange={setTab} />

        {/* Hai việc phụ, để cạnh nhau ngay dưới tab: nhét vào header thì thanh
            trên đã có 6 nút và tràn trên máy nhỏ. */}
        <div className="-mt-1 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={toggleAmountsHidden}
            aria-label={amountsHidden ? t.showAmounts : t.hideAmounts}
            title={amountsHidden ? t.showAmounts : t.hideAmounts}
            className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] px-2.5 py-1.5 text-[12px] font-bold transition-transform duration-150 active:scale-95"
            style={{ borderColor: theme.border, background: theme.chip, color: theme.muted }}
          >
            {amountsHidden ? (
              <EyeOffIcon className="size-3.5" />
            ) : (
              <EyeIcon className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setCategoryManagerOpen(true)}
            className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] px-2.5 py-1.5 text-[12px] font-bold transition-transform duration-150 active:scale-95"
            style={{ borderColor: theme.border, background: theme.chip, color: theme.muted }}
          >
            <SlidersHorizontalIcon className="size-3.5" />
            {t.manageExpenseCategories}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-[11px] border-[1.5px] px-2.5 py-1.5 text-[12px] font-bold transition-transform duration-150 active:scale-95"
            style={{ borderColor: theme.border, background: theme.chip, color: theme.muted }}
          >
            <DownloadIcon className="size-3.5" />
            {t.exportCsv}
          </button>
        </div>

        {tab === 'list' ? (
          <ExpenseList
            expenses={visibleExpenses}
            monthCount={expenses.length}
            categories={categories}
            filter={filter}
            onFilterChange={setFilter}
            onEdit={setEditTarget}
            onDelete={handleDelete}
            onMarkPaid={handleMarkPaid}
          />
        ) : (
          // Báo cáo cố ý KHÔNG chịu ảnh hưởng của bộ lọc: nó là bức tranh cả
          // tháng, một báo cáo đã lọc mà không nói rõ sẽ bị đọc thành toàn cảnh.
          <MonthlyReport month={month} />
        )}
      </div>

      <ExpenseCategoryManagerModal
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />

      <Dialog open={editTarget !== null} onOpenChange={(next) => !next && setEditTarget(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[85dvh] w-full max-w-full overflow-y-auto rounded-t-[26px] rounded-b-none border-[1.5px] p-5 max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[calc(100%-2rem)] sm:max-w-[440px] sm:rounded-[26px] sm:p-6"
          style={{ background: theme.modalBg, borderColor: theme.border, color: theme.text }}
        >
          <DialogTitle
            className="font-heading text-xl font-extrabold"
            style={{ color: theme.text }}
          >
            {editTarget === 'new' ? t.addExpense : t.editExpense}
          </DialogTitle>
          {editTarget !== null && (
            <ExpenseEditForm
              // Remount khi đổi mục tiêu, nếu không react-hook-form giữ nguyên
              // defaultValues của lần mở trước và form hiện dữ liệu dòng cũ.
              key={editTarget === 'new' ? 'new' : editTarget.id}
              expense={editTarget === 'new' ? undefined : editTarget}
              defaultDate={defaultDateForMonth}
              onDone={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
