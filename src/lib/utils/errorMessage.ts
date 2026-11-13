import type { Dictionary } from '@/features/i18n/dictionary'

/** Lỗi nào cũng có thể mang `code` (Postgres/PostgREST/Supabase Auth) hoặc `status` (HTTP). */
interface ErrorLike {
  code?: unknown
  status?: unknown
  message?: unknown
}

/** Câu trả lời riêng của từng màn hình, khi nó biết rõ hơn lỗi chung. */
export interface ErrorOverrides {
  /** Vi phạm unique, ví dụ "đã có danh mục tên này". */
  duplicate?: string
  /** Lỗi mạng, ví dụ "giao dịch chưa được lưu". */
  network?: string
}

const NETWORK_RE = /failed to fetch|networkerror|load failed|network request failed/i
const MAX_DETAIL = 140

/**
 * Lỗi do không tới được máy chủ (mất mạng, DNS, CORS chặn…), không phải máy chủ
 * từ chối. Dựa vào lỗi thật của `fetch` trước; cờ `navigator.onLine` chỉ là phụ
 * vì trên iOS nó đôi khi báo sai.
 */
export function isNetworkError(
  error: unknown,
  online: boolean = typeof navigator === 'undefined' ? true : navigator.onLine,
): boolean {
  if (!online) return true
  const e: ErrorLike = typeof error === 'object' && error !== null ? error : {}
  const message = typeof e.message === 'string' ? e.message : ''
  return NETWORK_RE.test(message)
}

/**
 * Đổi một lỗi bắt được thành câu nói thẳng NGUYÊN NHÂN để người dùng biết sửa
 * gì, thay vì "có lỗi xảy ra" chung chung.
 *
 * Nhận diện theo mã chứ không theo câu chữ khi có thể: mã Postgres (23505...),
 * mã PostgREST (PGRST...) và mã Supabase Auth ổn định hơn nhiều so với message.
 * Lỗi không nhận ra thì vẫn hiện câu chung kèm message gốc, để ít nhất còn một
 * manh mối thay vì mất sạch thông tin.
 */
export function describeError(
  t: Dictionary,
  error: unknown,
  overrides: ErrorOverrides = {},
): string {
  const e: ErrorLike = typeof error === 'object' && error !== null ? error : {}
  const code = typeof e.code === 'string' ? e.code : ''
  const status = typeof e.status === 'number' ? e.status : 0
  const message = typeof e.message === 'string' ? e.message : ''

  if (isNetworkError(error)) return overrides.network ?? t.errNetwork

  switch (code) {
    case '23505':
      return overrides.duplicate ?? t.errDuplicate
    case '23503':
      return t.errReference
    case '23502':
      return t.errRequired
    case '23514':
    case '22P02':
    case '22003':
      return t.errInvalidValue
    case '22001':
      return t.errTooLong
    case '42501':
      return t.errPermission
    case 'PGRST116':
      return t.errNotFound
    case 'PGRST301':
    case 'PGRST303':
    case 'session_expired':
    case 'refresh_token_not_found':
      return t.errSessionExpired
    case 'invalid_credentials':
      return t.errInvalidLogin
    case 'user_already_exists':
    case 'email_exists':
      return t.errEmailTaken
    case 'email_not_confirmed':
      return t.errEmailNotConfirmed
    case 'weak_password':
      return t.errWeakPassword
    case 'same_password':
      return t.errSamePassword
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return t.errRateLimit
  }

  // Bản supabase-js cũ không gắn `code` cho lỗi đăng nhập; nhận qua câu chữ.
  if (/invalid login credentials/i.test(message)) return t.errInvalidLogin
  if (/user already registered/i.test(message)) return t.errEmailTaken
  if (/jwt expired/i.test(message)) return t.errSessionExpired
  if (status === 429) return t.errRateLimit
  if (status === 401) return t.errSessionExpired
  if (status === 403) return t.errPermission

  const detail = message.trim().slice(0, MAX_DETAIL)
  return detail ? `${t.somethingWentWrong} (${detail})` : t.somethingWentWrong
}
