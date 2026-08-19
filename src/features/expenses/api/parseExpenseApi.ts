import { supabase } from '@/lib/supabase/client'
import type { Currency } from '@/lib/supabase/database.types'

const ENDPOINT = '/.netlify/functions/parse-expense'

/** Khớp với `MAX_TEXT_LENGTH` trong `netlify/functions/parse-expense.js`. */
export const MAX_PARSE_TEXT_LENGTH = 500

/** Một khoản chi AI tách ra — bản nháp, chưa nằm trong DB. */
export interface ParsedExpenseItem {
  amount: number
  currency: Currency
  /** Tên danh mục (chuỗi), không phải id — function chỉ biết tên mình gửi lên. */
  category: string
  note: string
  spent_at: string
  /** 'low' = câu mơ hồ; UI tô cảnh báo để người dùng để mắt tới dòng đó. */
  confidence: 'high' | 'low'
}

/**
 * Mã lỗi function có thể trả. Giữ nguyên chuỗi từ server để UI chọn đúng câu
 * thông báo — không bao giờ hiện message thô của Groq cho người dùng.
 */
export type ParseExpenseErrorCode =
  | 'auth'
  | 'rate_limited'
  | 'timeout'
  | 'parse_failed'
  | 'bad_request'
  | 'config'
  | 'network'
  | 'upstream'

export class ParseExpenseError extends Error {
  code: ParseExpenseErrorCode
  constructor(code: ParseExpenseErrorCode, message: string) {
    super(message)
    this.name = 'ParseExpenseError'
    this.code = code
  }
}

interface ParseExpenseArgs {
  text: string
  /** 'YYYY-MM-DD' của máy người dùng — server không đoán múi giờ hộ. */
  today: string
  /** Tên các danh mục của chính user này; AI chỉ được chọn trong đây. */
  categories: string[]
  defaultCurrency: Currency
}

export async function parseExpenseText({
  text,
  today,
  categories,
  defaultCurrency,
}: ParseExpenseArgs): Promise<ParsedExpenseItem[]> {
  // Endpoint có xác thực JWT: nó tiêu quota key của mình và nhận dữ liệu tài
  // chính cá nhân, nên không gọi được nếu không kèm token.
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ParseExpenseError('auth', 'No session')

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, today, categories, defaultCurrency }),
    })
  } catch {
    throw new ParseExpenseError('network', 'Fetch failed')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const code = (body?.error?.code as ParseExpenseErrorCode) ?? 'upstream'
    throw new ParseExpenseError(code, body?.error?.message ?? 'Request failed')
  }
  if (!Array.isArray(body?.items)) throw new ParseExpenseError('upstream', 'Malformed response')

  return body.items as ParsedExpenseItem[]
}
