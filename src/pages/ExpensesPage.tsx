import { useState } from 'react'
import { DownloadIcon, SlidersHorizontalIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIsMobile, useIsTouchDevice } from '@/hooks/useMediaQuery'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useProfilePreferenceSync } from '@/features/profile/hooks/useProfilePreferenceSync'
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
import type { ParsedExpenseItem } from '@/features/expenses/api/parseExpenseApi'
import { useExpensesForMonth } from '@/features/expenses/hooks/useExpenses'
import { useExpenseCategories } from '@/features/expenses/hooks/useExpenseCategories'
import { useDeleteExpense } from '@/features/expenses/hooks/useExpenseMutations'
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

export function ExpensesPage() {
  useProfilePreferenceSync()

  const { t, locale, setLocale } = useTranslation()
  const { theme } = useTheme()
  const isMobile = useIsMobile()
  const isTouch = useIsTouchDevice()

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile && !isTouch)
  const [month, setMonth] = useState(currentMonthKey)
  const [tab, setTab] = useState<ExpenseTab>('list')
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  /** Bản nháp AI đang chờ xác nhận — không có gì được ghi vào DB cho tới khi lưu. */
  const [draft, setDraft] = useState<{ items: ParsedExpenseItem[]; rawText: string } | null>(null)

  const { data: expenses = [] } = useExpensesForMonth(month)
  const { data: categories = [] } = useExpenseCategories()
  const deleteExpense = useDeleteExpense()

  const { monthIndex, year } = monthLabelParts(month)
  const monthLabel = `${t.mon[monthIndex]} ${year}`

  // Đang xem tháng này thì điền hôm nay; xem tháng khác thì điền ngày 1 của
  // tháng đó — nếu cứ điền hôm nay, khoản vừa thêm sẽ rơi ra ngoài danh sách
  // đang mở và trông như bị mất.
  const defaultDateForMonth = month === currentMonthKey() ? todayISO() : monthRange(month).startISO

  const handleExportCsv = () => {
    if (expenses.length === 0) {
      toast.error(t.noExpenses)
      return
    }
    downloadCsv(expensesCsvFilename(month), buildExpensesCsv(expenses, categories, t))
  }

  const handleDelete = (expense: Expense) => {
    if (!window.confirm(t.deleteExpenseConfirm)) return
    deleteExpense.mutate(expense.id, {
      onSuccess: () => toast.success(t.expenseDeleted),
      onError: () => toast.error(t.somethingWentWrong),
    })
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
            items={draft.items}
            rawText={draft.rawText}
            onDone={() => setDraft(null)}
          />
        ) : (
          <QuickAddSheet
            onDrafts={(items, rawText) => setDraft({ items, rawText })}
            onEnterManually={() => setEditTarget('new')}
          />
        )}

        <ExpenseTabs value={tab} onChange={setTab} />

        {/* Hai việc phụ, để cạnh nhau ngay dưới tab: nhét vào header thì thanh
            trên đã có 6 nút và tràn trên máy nhỏ. */}
        <div className="-mt-1 flex flex-wrap justify-end gap-2">
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
            expenses={expenses}
            categories={categories}
            onEdit={setEditTarget}
            onDelete={handleDelete}
          />
        ) : (
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
