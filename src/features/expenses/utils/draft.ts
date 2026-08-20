import type { Currency, ExpenseKind } from '@/lib/supabase/database.types'
import type { ParsedExpenseItem } from '../api/parseExpenseApi'
import { CURRENCIES, KINDS } from '../schemas/expenseSchema'

/** Giá trị "chưa phân loại" của `<Select>` — xem chú thích ở ExpenseEditForm. */
export const NO_CATEGORY = '__none__'

export interface DraftRow {
  /** Khoá ổn định để React không nhầm dòng khi xoá dòng ở giữa. */
  key: string
  amount: string
  currency: Currency
  kind: ExpenseKind
  /**
   * Tên danh mục AI trả về, giữ nguyên dạng chuỗi.
   *
   * Không quy sang uuid ngay lúc tạo dòng: bảng nháp giờ sống qua một lần tải
   * lại trang, và ngay sau reload thì danh sách danh mục còn chưa fetch xong —
   * quy đổi lúc đó sẽ ra "chưa phân loại" cho tất cả và không có gì sửa lại nữa.
   * Tên ở đây, id được tra lúc render, nên đến muộn vẫn khớp.
   */
  aiCategory: string
  /** Null = chưa tự chọn, cứ theo `aiCategory`. Người dùng chọn tay thì ghi vào đây. */
  categoryId: string | null
  note: string
  spentAt: string
  confidence: 'high' | 'low'
}

/** Bản nháp đang chờ xác nhận, đủ để dựng lại nguyên trạng sau khi reload. */
export interface ExpenseDraft {
  /** Câu gốc — lưu vào `raw_text` để sửa lại được khi AI parse sai. */
  rawText: string
  rows: DraftRow[]
}

export function toDraftRows(items: ParsedExpenseItem[]): DraftRow[] {
  return items.map((item, index) => ({
    key: `${index}`,
    amount: String(item.amount),
    currency: item.currency,
    kind: item.kind,
    aiCategory: item.category,
    categoryId: null,
    note: item.note,
    spentAt: item.spent_at,
    confidence: item.confidence,
  }))
}

const isCurrency = (v: unknown): v is Currency => CURRENCIES.includes(v as Currency)
const isKind = (v: unknown): v is ExpenseKind => KINDS.includes(v as ExpenseKind)

function isDraftRow(value: unknown): value is DraftRow {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.key === 'string' &&
    typeof r.amount === 'string' &&
    isCurrency(r.currency) &&
    isKind(r.kind) &&
    typeof r.aiCategory === 'string' &&
    (r.categoryId === null || typeof r.categoryId === 'string') &&
    typeof r.note === 'string' &&
    typeof r.spentAt === 'string' &&
    (r.confidence === 'high' || r.confidence === 'low')
  )
}

/**
 * Canh cổng cho dữ liệu đọc ra từ `sessionStorage`: bản nháp lưu bằng một bản
 * deploy trước có thể thiếu field mới, và một dòng thiếu `kind` sẽ đi thẳng vào
 * DB dưới dạng khoản chi. Sai shape thì bỏ cả bản nháp, không cố vá từng dòng.
 */
export function isExpenseDraft(value: unknown): value is ExpenseDraft | null {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return typeof d.rawText === 'string' && Array.isArray(d.rows) && d.rows.every(isDraftRow)
}
