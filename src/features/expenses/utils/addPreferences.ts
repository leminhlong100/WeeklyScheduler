import type { Currency, ExpenseKind } from '@/lib/supabase/database.types'

/**
 * Lựa chọn lần trước khi thêm giao dịch, theo TỪNG sổ: tiền tệ, Chi/Thu, danh
 * mục cuối cho mỗi loại, và lịch sử danh mục gần đây để xếp lưới danh mục.
 *
 * Trước đây mỗi lần mở form đều về VND / Chi / Chưa phân loại — người hay ghi
 * yên hay ghi cùng một danh mục phải chọn lại từ đầu mỗi lần.
 * localStorage chứ không DB: đây là tiện ích của riêng thiết bị này, mất đi
 * thì chỉ là form về mặc định.
 */
export interface AddPreferences {
  currency?: Currency
  kind?: ExpenseKind
  lastCategory?: Partial<Record<ExpenseKind, string>>
  /** Id danh mục, mới nhất ở đầu, tối đa `HISTORY_LIMIT`. */
  history?: string[]
}

const HISTORY_LIMIT = 30
const key = (ledgerKey: string) => `weeklyScheduler.expenseAddPrefs.${ledgerKey}`

export function readAddPreferences(ledgerKey: string): AddPreferences {
  try {
    const raw = window.localStorage.getItem(key(ledgerKey))
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return typeof parsed === 'object' && parsed !== null ? (parsed as AddPreferences) : {}
  } catch {
    return {}
  }
}

export function rememberAddChoice(
  ledgerKey: string,
  choice: { currency: Currency; kind: ExpenseKind; categoryId: string | null },
): void {
  const prev = readAddPreferences(ledgerKey)
  const next: AddPreferences = {
    currency: choice.currency,
    kind: choice.kind,
    lastCategory: { ...prev.lastCategory },
    history: prev.history ?? [],
  }
  if (choice.categoryId) {
    next.lastCategory![choice.kind] = choice.categoryId
    next.history = [choice.categoryId, ...next.history!].slice(0, HISTORY_LIMIT)
  }
  try {
    window.localStorage.setItem(key(ledgerKey), JSON.stringify(next))
  } catch {
    // Không lưu được thì lần sau form về mặc định — không có gì hỏng.
  }
}

/**
 * Thứ tự danh mục cho lưới: dùng nhiều nhất trong lịch sử gần đây lên đầu, hoà
 * thì cái dùng gần hơn trước; danh mục chưa dùng giữ thứ tự gốc (`sort_order`).
 */
export function orderByUsage<T extends { id: string }>(items: T[], history: string[] = []): T[] {
  const score = new Map<string, number>()
  history.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 + (HISTORY_LIMIT - i) / 1000))
  return items
    .map((item, index) => ({ item, index, s: score.get(item.id) ?? 0 }))
    .sort((a, b) => b.s - a.s || a.index - b.index)
    .map((x) => x.item)
}
