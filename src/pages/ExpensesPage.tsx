import { useDeferredValue, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useIsMobile, useIsTouchDevice } from '@/hooks/useMediaQuery'
import { useSessionStorageState } from '@/hooks/useSessionStorageState'
import { useBackToClose } from '@/hooks/useBackToClose'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { useTheme } from '@/features/theme/ThemeContext'
import { useAmountVisibility } from '@/features/expenses/AmountVisibilityContext'
import { UserMenu } from '@/features/profile/components/UserMenu'
import { AppShell } from '@/features/layout/components/AppShell'
import { Sidebar } from '@/features/layout/components/Sidebar'
import { ExpensesHeader } from '@/features/expenses/components/ExpensesHeader'
import { ExpenseList } from '@/features/expenses/components/ExpenseList'
import { QueryStatus } from '@/features/expenses/components/QueryStatus'
import { ExpenseEditForm } from '@/features/expenses/components/ExpenseEditForm'
import { AmountVisibilityDialog } from '@/features/expenses/components/AmountVisibilityDialog'
import { ExpenseCategoryManagerModal } from '@/features/expenses/components/ExpenseCategoryManagerModal'
import { LedgerBar } from '@/features/expenses/components/LedgerBar'
import {
  LedgerSettingsDialog,
  type LedgerDialogTarget,
} from '@/features/expenses/components/LedgerSettingsDialog'
import { ExpenseBottomNav, ExpenseTopNav } from '@/features/expenses/components/ExpenseBottomNav'
import { OverviewTab } from '@/features/expenses/components/OverviewTab'
import { ReportTab } from '@/features/expenses/components/ReportTab'
import { MoreTab } from '@/features/expenses/components/MoreTab'
import { MonthPicker } from '@/features/expenses/components/MonthPicker'
import { AddTransactionSheet } from '@/features/expenses/components/AddTransactionSheet'
import { SheetDialog } from '@/features/expenses/components/SheetDialog'
import { LedgerProvider, useCurrentLedger } from '@/features/expenses/LedgerContext'
import {
  buildExpensesCsv,
  downloadCsv,
  expensesCsvFilename,
} from '@/features/expenses/utils/exportCsv'
import { isExpenseDraft, type ExpenseDraft } from '@/features/expenses/utils/draft'
import {
  EMPTY_EXPENSE_FILTER,
  filterExpenses,
  type ExpenseFilter,
} from '@/features/expenses/utils/filter'
import { useExpensesForMonth } from '@/features/expenses/hooks/useExpenses'
import { useExpenseCategories } from '@/features/expenses/hooks/useExpenseCategories'
import { useExpensesUrlState } from '@/features/expenses/hooks/useExpensesUrlState'
import { useUndoableActions } from '@/features/expenses/hooks/useUndoableActions'
import type { Expense } from '@/features/expenses/api/expensesApi'
import { todayISO } from '@/lib/utils/date'
import {
  currentMonthKey,
  monthLabelParts,
  monthRange,
  shiftMonth,
} from '@/features/expenses/utils/month'

/**
 * Bản nháp AI nằm trong `sessionStorage`, không chỉ trong state.
 *
 * Một bản nháp đã tốn một lượt gọi AI và thường đã được sửa vài dòng bằng tay.
 * Bấm nhầm sang trang lịch tuần, hay chỉ F5, mà mất sạch thì người dùng phải nói
 * lại từ đầu và tiêu thêm một lượt quota. Khoá đặt tên có tiền tố module để
 * không đụng phần lịch tuần.
 */
const DRAFT_STORAGE_KEY = 'weekly-scheduler:expense-draft'

/**
 * Mọi thứ bên trong đọc sổ đang mở từ `LedgerProvider` — danh sách, báo cáo,
 * form sửa và AI nhập nhanh đều tự đi theo sổ.
 */
export function ExpensesPage() {
  return (
    <LedgerProvider>
      <ExpensesPageContent />
    </LedgerProvider>
  )
}

/**
 * Bố cục: header (tháng) → chip sổ → nội dung theo tab. Tab và tháng nằm trên
 * URL (`useExpensesUrlState`). Mobile có thanh dưới 4 tab + nút ＋ ở giữa;
 * desktop có hàng tab ở đầu nội dung và nút "Thêm giao dịch" có chữ ở header.
 */
function ExpensesPageContent() {
  const { t, locale, setLocale } = useTranslation()
  const { ledgerId, canEdit } = useCurrentLedger()
  const { theme } = useTheme()
  const { hidden: amountsHidden } = useAmountVisibility()
  const isMobile = useIsMobile()
  const isTouch = useIsTouchDevice()
  const { month, view, setMonth, setView } = useExpensesUrlState()

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile && !isTouch)
  // Chỉ drawer trên mobile là một "lớp"; sidebar desktop là một cột cố định.
  useBackToClose(isMobile && sidebarOpen, () => setSidebarOpen(false))
  const [ledgerDialog, setLedgerDialog] = useState<LedgerDialogTarget>(null)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [hideOptionsOpen, setHideOptionsOpen] = useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [filter, setFilter] = useState<ExpenseFilter>(EMPTY_EXPENSE_FILTER)
  // Bộ lọc danh mục trỏ vào danh mục của chủ sổ; sang sổ của người khác thì
  // danh mục đó không còn, lọc tiếp chỉ ra một danh sách rỗng khó hiểu.
  const [filterLedger, setFilterLedger] = useState(ledgerId)
  if (filterLedger !== ledgerId) {
    setFilterLedger(ledgerId)
    setFilter(EMPTY_EXPENSE_FILTER)
  }
  /** Không có gì được ghi vào DB cho tới khi user bấm lưu bản nháp này. */
  const [draft, setDraft] = useSessionStorageState<ExpenseDraft | null>(
    DRAFT_STORAGE_KEY,
    null,
    isExpenseDraft,
  )

  const expensesQuery = useExpensesForMonth(month)
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data])
  const { data: categories = [] } = useExpenseCategories()
  const { markPaidWithUndo } = useUndoableActions()

  const { monthIndex, year } = monthLabelParts(month)
  const monthLabel = `${t.mon[monthIndex]} ${year}`
  const isCurrentMonth = month === currentMonthKey()

  const categoryNames = useMemo(
    () => new Map(categories.map((c) => [c.id, translateExpenseCategoryName(c.name, t)] as const)),
    [categories, t],
  )
  // Ô tìm đọc `filter` ngay; danh sách lọc theo bản hoãn. Gõ phím không phải đợi
  // vẽ lại vài trăm dòng — React vẽ danh sách sau, và bỏ dở nếu có phím mới.
  const deferredFilter = useDeferredValue(filter)
  const visibleExpenses = useMemo(
    () => filterExpenses(expenses, deferredFilter, { matchAmount: !amountsHidden, categoryNames }),
    [expenses, deferredFilter, amountsHidden, categoryNames],
  )

  // Đang xem tháng này thì điền hôm nay; xem tháng khác thì điền ngày 1 của
  // tháng đó — nếu cứ điền hôm nay, khoản vừa thêm sẽ rơi ra ngoài danh sách
  // đang mở và trông như bị mất.
  const defaultDateForMonth = isCurrentMonth ? todayISO() : monthRange(month).startISO

  const openAdd = canEdit ? () => setAddOpen(true) : undefined

  const handleExportCsv = () => {
    // Xuất đúng tập đang xem: đã lọc thì file phải khớp với những gì trên màn
    // hình, chứ không âm thầm kèm cả những dòng vừa bị lọc ra.
    if (visibleExpenses.length === 0) {
      toast.error(t.noExpenses)
      return
    }
    downloadCsv(expensesCsvFilename(month, t), buildExpensesCsv(visibleExpenses, categories, t))
  }

  // "Đã trả" làm ngay, có Hoàn tác 5 giây — không hỏi lại trước. (Xoá nằm
  // trong form sửa, cùng cơ chế Hoàn tác.)
  /** Khoản dự kiến -> đã trả. Từ lúc này nó mới được cộng vào tổng và số dư. */
  const handleMarkPaid = markPaidWithUndo

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
          isCurrentMonth={isCurrentMonth}
          onPickMonth={() => setMonthPickerOpen(true)}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onPrevMonth={() => setMonth((m) => shiftMonth(m, -1))}
          onNextMonth={() => setMonth((m) => shiftMonth(m, 1))}
          onThisMonth={() => setMonth(currentMonthKey())}
          onAddExpense={openAdd}
          userMenu={<UserMenu />}
        />
      }
      bottomBar={<ExpenseBottomNav view={view} onChange={setView} onAdd={openAdd} />}
    >
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-3 py-4 sm:px-5 sm:py-6">
        <ExpenseTopNav view={view} onChange={setView} />

        <LedgerBar
          onCreate={() => setLedgerDialog('new')}
          onOpenSettings={() => ledgerId && setLedgerDialog(ledgerId)}
        />

        {view === 'overview' && (
          <QueryStatus query={expensesQuery}>
            <OverviewTab
              month={month}
              expenses={expenses}
              categories={categories}
              ledgerId={ledgerId}
              canEdit={canEdit}
              onAdd={() => setAddOpen(true)}
              onOpenCategories={() => setCategoryManagerOpen(true)}
              onSeeTransactions={() => setView('transactions')}
              onSeeReport={() => setView('report')}
              onEdit={canEdit ? setEditTarget : undefined}
              onMarkPaid={canEdit ? handleMarkPaid : undefined}
            />
          </QueryStatus>
        )}

        {view === 'transactions' && (
          <QueryStatus query={expensesQuery}>
            <ExpenseList
              expenses={visibleExpenses}
              monthCount={expenses.length}
              categories={categories}
              filter={filter}
              onFilterChange={setFilter}
              onEdit={canEdit ? setEditTarget : undefined}
              onMarkPaid={canEdit ? handleMarkPaid : undefined}
            />
          </QueryStatus>
        )}

        {/* Báo cáo cố ý KHÔNG chịu ảnh hưởng của bộ lọc: nó là bức tranh cả
            tháng, một báo cáo đã lọc mà không nói rõ sẽ bị đọc thành toàn cảnh. */}
        {view === 'report' && <ReportTab month={month} />}

        {view === 'more' && (
          <MoreTab
            canEdit={canEdit}
            ledgerId={ledgerId}
            onCreateLedger={() => setLedgerDialog('new')}
            onLedgerSettings={() => ledgerId && setLedgerDialog(ledgerId)}
            onCategories={() => setCategoryManagerOpen(true)}
            onHideOptions={() => setHideOptionsOpen(true)}
            onExportCsv={handleExportCsv}
          />
        )}
      </div>

      <LedgerSettingsDialog target={ledgerDialog} onClose={() => setLedgerDialog(null)} />
      <ExpenseCategoryManagerModal
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />
      <AmountVisibilityDialog open={hideOptionsOpen} onOpenChange={setHideOptionsOpen} />
      <MonthPicker
        open={monthPickerOpen}
        onOpenChange={setMonthPickerOpen}
        value={month}
        onChange={setMonth}
      />

      {canEdit && (
        <AddTransactionSheet
          open={addOpen}
          onOpenChange={setAddOpen}
          defaultDate={defaultDateForMonth}
          draft={draft}
          onDraftChange={setDraft}
        />
      )}

      <SheetDialog
        open={canEdit && editTarget !== null}
        onOpenChange={(next) => !next && setEditTarget(null)}
        title={editTarget?.kind === 'income' ? t.editIncome : t.editExpense}
      >
        {editTarget && (
          <ExpenseEditForm
            // Remount khi đổi mục tiêu, nếu không react-hook-form giữ nguyên
            // defaultValues của lần mở trước và form hiện dữ liệu dòng cũ.
            key={editTarget.id}
            expense={editTarget}
            onDone={() => setEditTarget(null)}
          />
        )}
      </SheetDialog>
    </AppShell>
  )
}
