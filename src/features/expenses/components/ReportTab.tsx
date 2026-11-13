import { useMemo } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useExpensesForYear } from '../hooks/useExpenses'
import { summarizeByCurrency } from '../utils/totals'
import type { MonthKey } from '../utils/month'
import { ExpenseSummaryCard } from './ExpenseSummaryCard'
import { MonthlyReport } from './MonthlyReport'

/**
 * Tab Báo cáo: báo cáo tháng (đã có biểu đồ tròn ở đầu mỗi khối tiền tệ), rồi
 * tổng cả năm. Thẻ năm trước đây nằm trên danh sách giao dịch, đứng trên cả thẻ
 * tháng — dù tháng mới là bối cảnh đang xem.
 */
export function ReportTab({ month }: { month: MonthKey }) {
  const { t } = useTranslation()
  const year = Number(month.slice(0, 4))
  const { data: yearExpenses } = useExpensesForYear(year)
  const yearSummaries = useMemo(() => summarizeByCurrency(yearExpenses ?? []), [yearExpenses])

  return (
    <div className="flex flex-col gap-4">
      <MonthlyReport month={month} />
      {yearSummaries.length > 0 && (
        <ExpenseSummaryCard
          scope="year"
          summaries={yearSummaries}
          title={t.yearSection.replace('{year}', String(year))}
          collapsible
        />
      )}
    </div>
  )
}
