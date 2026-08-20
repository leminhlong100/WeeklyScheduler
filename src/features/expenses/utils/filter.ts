import type { Expense } from '../api/expensesApi'
import { UNCATEGORIZED } from './report'

/** 'all' = không lọc theo loại. */
export type KindFilter = 'all' | 'expense' | 'income'

/** 'all' = mọi danh mục; `UNCATEGORIZED` = chỉ những dòng chưa gán danh mục. */
export type CategoryFilter = 'all' | typeof UNCATEGORIZED | string

export interface ExpenseFilter {
  query: string
  kind: KindFilter
  categoryId: CategoryFilter
}

export const EMPTY_EXPENSE_FILTER: ExpenseFilter = {
  query: '',
  kind: 'all',
  categoryId: 'all',
}

export function isFilterActive(filter: ExpenseFilter): boolean {
  return filter.query.trim() !== '' || filter.kind !== 'all' || filter.categoryId !== 'all'
}

/**
 * Bỏ dấu và hạ chữ thường trước khi so.
 *
 * Người Việt gõ tìm kiếm rất hay bỏ dấu ("ca phe", "bun bo"), và trên bàn phím
 * điện thoại thì gần như luôn vậy. So chuỗi thô sẽ không ra gì và người dùng kết
 * luận là tìm kiếm hỏng. `NFD` tách dấu thành ký tự tổ hợp rồi xoá; `đ` không có
 * dạng tổ hợp nên phải xử lý tay.
 */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}

/**
 * Lọc trong bộ nhớ trên dữ liệu một tháng đã fetch sẵn — vài trăm dòng, gõ tới
 * đâu thấy tới đó, không thêm một round-trip nào và vẫn chạy khi offline.
 *
 * Khớp cả `note`, `raw_text` (câu gốc AI tách ra: gõ "bún" vẫn tìm được dòng đã
 * bị sửa ghi chú) và chính con số tiền.
 */
export function filterExpenses(expenses: Expense[], filter: ExpenseFilter): Expense[] {
  const needle = normalize(filter.query.trim())

  return expenses.filter((e) => {
    if (filter.kind !== 'all' && e.kind !== filter.kind) return false

    if (filter.categoryId === UNCATEGORIZED) {
      if (e.category_id !== null) return false
    } else if (filter.categoryId !== 'all' && e.category_id !== filter.categoryId) {
      return false
    }

    if (needle === '') return true
    const haystack = normalize(`${e.note} ${e.raw_text ?? ''} ${e.amount}`)
    return haystack.includes(needle)
  })
}

export interface ExpenseDayGroup {
  /** 'YYYY-MM-DD' */
  date: string
  expenses: Expense[]
}

/**
 * Gom theo ngày, giữ nguyên thứ tự đã sắp từ query (ngày mới nhất trước, trong
 * cùng ngày thì dòng nhập sau lên trên).
 *
 * Một danh sách phẳng 150 dòng không cho biết "hôm qua tiêu bao nhiêu" — câu hỏi
 * hay gặp nhất khi mở app. Nhóm theo ngày kèm tổng từng ngày trả lời nó mà không
 * cần thêm màn hình nào.
 */
export function groupByDay(expenses: Expense[]): ExpenseDayGroup[] {
  const groups: ExpenseDayGroup[] = []
  let current: ExpenseDayGroup | null = null

  for (const e of expenses) {
    if (!current || current.date !== e.spent_at) {
      current = { date: e.spent_at, expenses: [] }
      groups.push(current)
    }
    current.expenses.push(e)
  }

  return groups
}
