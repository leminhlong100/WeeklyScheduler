import { useMemo, type ReactNode } from 'react'
import { ChevronRightIcon, CircleAlertIcon, SparklesIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { translateExpenseCategoryName } from '@/features/i18n/defaultExpenseCategoryNames'
import { formatMoney, formatPercent, formatSignedMoney } from '@/lib/utils/formatMoney'
import { todayISO } from '@/lib/utils/date'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import { DEFAULT_CURRENCY } from '../schemas/expenseSchema'
import { currentMonthKey, monthLabelParts, type MonthKey } from '../utils/month'
import { buildBudgetProgress, computeSpendable, upcomingPlanned } from '../utils/overview'
import { summarizeByCurrency } from '../utils/totals'
import { LedgerBalanceCard } from './LedgerBalanceCard'
import { ExpenseRow } from './ExpenseRow'
import { MaskedAmount } from './MaskedAmount'
import { EyeToggle } from './EyeToggle'
import { DataFreshness, type QueryLike } from './QueryStatus'

interface OverviewTabProps {
  month: MonthKey
  expenses: Expense[]
  categories: ExpenseCategory[]
  /** Sổ chia sẻ đang mở; `null` = sổ cá nhân. */
  ledgerId: string | null
  canEdit: boolean
  onAdd: () => void
  onOpenCategories: () => void
  onSeeTransactions: () => void
  onSeeReport: () => void
  onEdit?: (expense: Expense) => void
  onMarkPaid?: (expense: Expense) => void
  /** Query của tháng đang xem: hiện "Cập nhật lúc … · Làm mới" dưới thẻ chính. */
  query?: QueryLike
}

/**
 * Tab mặc định. Trả lời ngay câu "tháng này mình còn bao nhiêu" bằng MỘT con số
 * lớn, rồi tới hạn mức, khoản sắp phải trả, và vài giao dịch gần nhất.
 */
export function OverviewTab({
  month,
  expenses,
  categories,
  ledgerId,
  canEdit,
  onAdd,
  onOpenCategories,
  onSeeTransactions,
  onSeeReport,
  onEdit,
  onMarkPaid,
  query,
}: OverviewTabProps) {
  const { t } = useTranslation()
  const today = todayISO()
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c] as const)),
    [categories],
  )
  const budgets = useMemo(() => buildBudgetProgress(expenses, categories), [expenses, categories])
  const upcoming = useMemo(() => upcomingPlanned(expenses, today), [expenses, today])
  const recent = useMemo(() => expenses.filter((e) => e.status === 'paid').slice(0, 5), [expenses])

  const isEmptyCurrentMonth = expenses.length === 0 && month === currentMonthKey()

  return (
    <div className="flex flex-col gap-4">
      {ledgerId ? (
        // Sổ quỹ chia sẻ: câu hỏi là "quỹ còn bao nhiêu" (cộng dồn), không phải
        // hạn mức của chủ sổ — người xem không đặt hạn mức đó.
        <>
          <LedgerBalanceCard ledgerId={ledgerId} />
          <MonthInOut expenses={expenses} month={month} />
        </>
      ) : (
        <SpendableCard
          month={month}
          expenses={expenses}
          categories={categories}
          onSetBudget={canEdit ? onOpenCategories : undefined}
        />
      )}

      {query && <DataFreshness query={query} />}

      {isEmptyCurrentMonth && canEdit && (
        <EmptyState onAdd={onAdd} onOpenCategories={onOpenCategories} />
      )}

      {!ledgerId && budgets.length > 0 && (
        <Section title={t.budgetsTitle} action={t.seeAll} onAction={onSeeReport}>
          <div className="flex flex-col gap-2.5">
            {budgets.slice(0, 5).map((row) => (
              <BudgetBar key={row.category.id} {...row} />
            ))}
          </div>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title={t.upcomingTitle}>
          <div className="flex flex-col gap-2">
            {upcoming.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                category={e.category_id ? (categoryById.get(e.category_id) ?? null) : null}
                onEdit={onEdit}
                onMarkPaid={onMarkPaid}
              />
            ))}
          </div>
        </Section>
      )}

      {recent.length > 0 && (
        <Section title={t.recentTitle} action={t.seeAllTransactions} onAction={onSeeTransactions}>
          <div className="flex flex-col gap-2">
            {recent.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                category={e.category_id ? (categoryById.get(e.category_id) ?? null) : null}
                onEdit={onEdit}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string
  action?: string
  onAction?: () => void
  children: ReactNode
}) {
  const { theme } = useTheme()
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="font-heading text-[16px] font-extrabold" style={{ color: theme.text }}>
          {title}
        </h2>
        {action && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="flex min-h-11 items-center gap-0.5 px-1 text-[13px] font-bold"
            style={{ color: theme.accentText }}
          >
            {action}
            <ChevronRightIcon className="size-4" />
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

function Card({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  return (
    <section
      className="flex flex-col gap-2 rounded-[22px] border-[1.5px] p-4"
      style={{ borderColor: theme.border, background: theme.chip }}
    >
      {children}
    </section>
  )
}

/** Thẻ chính: "Còn được tiêu" khi có hạn mức, không thì số dư tháng. */
function SpendableCard({
  month,
  expenses,
  categories,
  onSetBudget,
}: {
  month: MonthKey
  expenses: Expense[]
  categories: ExpenseCategory[]
  onSetBudget?: () => void
}) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const spendable = useMemo(
    () => computeSpendable(expenses, categories, month, todayISO()),
    [expenses, categories, month],
  )
  const summaries = useMemo(() => summarizeByCurrency(expenses), [expenses])
  const main = summaries.find((s) => s.currency === DEFAULT_CURRENCY) ?? summaries[0]
  const others = summaries.filter((s) => s !== main)
  const { monthIndex, year } = monthLabelParts(month)
  const monthName = `${t.mon[monthIndex]} ${year}`

  const money = (v: number, c = DEFAULT_CURRENCY as typeof main.currency) =>
    formatMoney(v, c, locale)

  if (spendable.mode === 'budget') {
    const over = spendable.remaining < 0
    const ratio = Math.min(spendable.usedRatio, 1)
    const barColor = over ? theme.danger : spendable.usedRatio >= 0.8 ? theme.warning : theme.accent
    return (
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div className="text-[13px] font-bold" style={{ color: theme.mutedText }}>
            {over ? t.spendableOver : t.spendableTitle}
          </div>
          <EyeToggle />
        </div>
        <div
          className="font-heading text-[34px] leading-tight font-extrabold tabular-nums"
          style={{ color: over ? theme.danger : theme.text }}
        >
          <MaskedAmount scope="month">
            {formatSignedMoney(spendable.remaining, DEFAULT_CURRENCY, locale, 'auto')}
          </MaskedAmount>
        </div>
        {spendable.perDay !== null && spendable.daysLeft !== null && !over && (
          <div className="text-[13.5px] font-bold" style={{ color: theme.text }}>
            {t.spendablePerDay.split('{amount}')[0]}
            <MaskedAmount scope="month">{money(spendable.perDay)}</MaskedAmount>
            {t.spendablePerDay.split('{amount}')[1]?.replace('{n}', String(spendable.daysLeft))}
          </div>
        )}
        <div
          className="mt-1 h-2.5 overflow-hidden rounded-full"
          style={{ background: theme.inputBg }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(spendable.usedRatio * 100)}
        >
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${ratio * 100}%`, background: barColor }}
          />
        </div>
        <div className="text-[12px] font-semibold" style={{ color: theme.mutedText }}>
          <MaskedAmount scope="month">
            {t.spendableUsed
              .replace('{p}', formatPercent(spendable.usedRatio, locale))
              .replace('{spent}', money(spendable.spent))
              .replace('{budget}', money(spendable.budgetTotal))}
          </MaskedAmount>
        </div>
        {spendable.planned > 0 && (
          <div className="text-[12px] font-semibold" style={{ color: theme.warning }}>
            <MaskedAmount scope="month">
              {t.spendablePlanned.replace(
                '{amount}',
                formatSignedMoney(spendable.planned, DEFAULT_CURRENCY, locale, 'expense'),
              )}
            </MaskedAmount>
          </div>
        )}
        {main && <InOutLine income={main.income} expense={main.expense} currency={main.currency} />}
        {others.map((s) => (
          <InOutLine key={s.currency} income={s.income} expense={s.expense} currency={s.currency} />
        ))}
      </Card>
    )
  }

  // Chưa đặt hạn mức: số dư tháng (thu − chi) là con số chính.
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-bold" style={{ color: theme.mutedText }}>
          {t.balanceTitle.replace('{month}', monthName)}
        </div>
        <EyeToggle />
      </div>
      <div
        className="font-heading text-[34px] leading-tight font-extrabold tabular-nums"
        style={{ color: main && main.balance < 0 ? theme.danger : theme.text }}
      >
        <MaskedAmount scope="month">
          {formatSignedMoney(
            main?.balance ?? 0,
            main?.currency ?? DEFAULT_CURRENCY,
            locale,
            'auto',
          )}
        </MaskedAmount>
      </div>
      {main && <InOutLine income={main.income} expense={main.expense} currency={main.currency} />}
      {others.map((s) => (
        <InOutLine key={s.currency} income={s.income} expense={s.expense} currency={s.currency} />
      ))}
      {onSetBudget && (
        <button
          type="button"
          onClick={onSetBudget}
          className="mt-1 flex min-h-11 items-center gap-1.5 self-start rounded-[12px] px-3 text-[13px] font-bold"
          style={{ background: theme.inputBg, color: theme.accentText }}
        >
          <SparklesIcon className="size-4" />
          {t.setBudgetCta}
        </button>
      )}
    </Card>
  )
}

function InOutLine({
  income,
  expense,
  currency,
}: {
  income: number
  expense: number
  currency: Expense['currency']
}) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] font-bold tabular-nums">
      <span style={{ color: theme.mutedText }}>
        {t.monthIncomeShort}{' '}
        <span style={{ color: theme.income }}>
          <MaskedAmount scope="month">
            {formatSignedMoney(income, currency, locale, 'income')}
          </MaskedAmount>
        </span>
      </span>
      <span style={{ color: theme.mutedText }}>
        {t.monthExpenseShort}{' '}
        <span style={{ color: theme.text }}>
          <MaskedAmount scope="month">
            {formatSignedMoney(expense, currency, locale, 'expense')}
          </MaskedAmount>
        </span>
      </span>
    </div>
  )
}

/** Thu/chi của tháng đang xem — dùng dưới thẻ số dư của sổ chia sẻ. */
function MonthInOut({ expenses, month }: { expenses: Expense[]; month: MonthKey }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const summaries = useMemo(() => summarizeByCurrency(expenses), [expenses])
  const { monthIndex, year } = monthLabelParts(month)
  if (summaries.length === 0) return null
  return (
    <Card>
      <div className="text-[13px] font-bold" style={{ color: theme.mutedText }}>
        {`${t.mon[monthIndex]} ${year}`}
      </div>
      {summaries.map((s) => (
        <InOutLine key={s.currency} income={s.income} expense={s.expense} currency={s.currency} />
      ))}
    </Card>
  )
}

function BudgetBar({
  category,
  spent,
  budget,
  ratio,
  warning,
  over,
}: ReturnType<typeof buildBudgetProgress>[number]) {
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const color = over ? theme.danger : warning ? theme.warning : theme.accent
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[13.5px] font-bold">
        <span aria-hidden>{category.emoji}</span>
        <span className="min-w-0 flex-1 truncate" style={{ color: theme.text }}>
          {translateExpenseCategoryName(category.name, t)}
        </span>
        {(warning || over) && (
          <CircleAlertIcon className="size-4 flex-shrink-0" style={{ color }} aria-hidden />
        )}
        <span
          className="flex-shrink-0 text-[12.5px] tabular-nums"
          style={{ color: over ? theme.danger : theme.mutedText }}
        >
          <MaskedAmount categoryId={category.id}>
            {`${formatMoney(spent, DEFAULT_CURRENCY, locale)} / ${formatMoney(budget, DEFAULT_CURRENCY, locale)}`}
          </MaskedAmount>
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: theme.inputBg }}
        role="progressbar"
        aria-label={translateExpenseCategoryName(category.name, t)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(ratio, 1) * 100}%`, background: color }}
        />
      </div>
    </div>
  )
}

function EmptyState({
  onAdd,
  onOpenCategories,
}: {
  onAdd: () => void
  onOpenCategories: () => void
}) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const steps: Array<[string, () => void]> = [
    [t.emptyStep1, onAdd],
    [t.emptyStep2, onOpenCategories],
    [t.emptyStep3, onAdd],
  ]
  return (
    <Card>
      <div className="font-heading text-[17px] font-extrabold" style={{ color: theme.text }}>
        {t.emptyTitle}
      </div>
      <ol className="flex flex-col gap-1.5">
        {steps.map(([label, action], i) => (
          <li key={label}>
            <button
              type="button"
              onClick={action}
              className="flex min-h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[13.5px] font-bold"
              style={{ background: theme.inputBg, color: theme.text }}
            >
              <span
                className="grid size-7 flex-shrink-0 place-items-center rounded-full text-[13px] font-extrabold"
                style={{ background: theme.accent }}
              >
                {i + 1}
              </span>
              <span className="flex-1">{label}</span>
              <ChevronRightIcon
                className="size-4 flex-shrink-0"
                style={{ color: theme.mutedText }}
              />
            </button>
          </li>
        ))}
      </ol>
    </Card>
  )
}
