import type { Dictionary } from '@/features/i18n/dictionary'
import type { Expense } from '../api/expensesApi'
import type { ExpenseCategory } from '../api/expenseCategoriesApi'
import type { MonthKey } from './month'

/**
 * Ký tự mở đầu khiến Excel / Google Sheets coi ô là CÔNG THỨC. Một ghi chú vô
 * tình bắt đầu bằng "-" (hay cố ý bắt đầu bằng "=") sẽ được thực thi khi mở
 * file. Thêm dấu nháy đơn phía trước để nó luôn là văn bản.
 */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

function escapeField(value: string): string {
  const safe = FORMULA_PREFIXES.includes(value[0]) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

/**
 * Số cho MÁY đọc, không phải cho người: không dấu phân cách nghìn, dấu chấm
 * thập phân. Định dạng theo locale (`40.000`) sẽ bị bảng tính hiểu thành 40
 * ở những nơi dùng dấu chấm làm thập phân.
 */
function formatNumber(value: number): string {
  return String(value)
}

export function buildExpensesCsv(
  expenses: Expense[],
  categories: ExpenseCategory[],
  t: Dictionary,
): string {
  const nameById = new Map(categories.map((c) => [c.id, c.name] as const))

  const header = [
    t.expenseDate,
    t.csvColumnKind,
    t.expenseAmount,
    t.expenseCurrency,
    t.expenseCategory,
    t.expenseNote,
    t.csvColumnStatus,
    t.csvColumnSource,
    t.csvColumnRawText,
  ]

  const rows = expenses.map((e) => [
    e.spent_at,
    // Mã thô ('expense'/'income'), không phải nhãn đã dịch: cột này để máy lọc
    // và để hai file xuất ở hai ngôn ngữ vẫn ghép được với nhau.
    e.kind,
    formatNumber(e.amount),
    e.currency,
    // Tên thô trong DB, không dịch: file xuất ra là dữ liệu, đổi ngôn ngữ giao
    // diện rồi xuất lại mà tên danh mục đổi theo thì hai file không ghép được.
    e.category_id ? (nameById.get(e.category_id) ?? '') : '',
    e.note,
    e.status,
    e.source,
    e.raw_text ?? '',
  ])

  // CRLF theo RFC 4180 — Excel bản Windows vẫn là nơi file này hay được mở nhất.
  return [header, ...rows].map((row) => row.map(escapeField).join(',')).join('\r\n')
}

export function expensesCsvFilename(month: MonthKey): string {
  return `chi-tieu-${month}.csv`
}

/**
 * Đẩy chuỗi CSV xuống máy. Có BOM ở đầu: thiếu nó thì Excel đọc file bằng
 * codepage hệ thống và tiếng Việt / tiếng Nhật ra ký tự rác — đây là lỗi hay
 * gặp nhất khi xuất CSV, mà lại chỉ tốn ba byte để tránh.
 */
const UTF8_BOM = '\ufeff'

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
