/**
 * Lõi gọi LLM (Groq) dùng chung cho Netlify Function (production) và plugin Vite
 * dev (xem `vite.config.ts`). Tên file bắt đầu bằng "_" nên Netlify coi đây là
 * module phụ trợ, KHÔNG deploy thành function riêng.
 *
 * API key luôn ở phía server (`GROQ_API_KEY`, không có tiền tố `VITE_`) nên
 * không bao giờ lọt vào bundle client.
 *
 * Rút gọn từ `Devleap/netlify/functions/_llm.js` — chỉ giữ phần hạ tầng gọi API:
 * AiError / sleep / backoffDelay / groqRequest / errorResponse.
 */

// Model đổi được qua env GROQ_MODEL. Groq khai tử model theo thời gian: họ llama-3.3
// (mặc định ban đầu của kế hoạch) đã biến mất khỏi /v1/models của key này, nên mặc định
// là openai/gpt-oss-120b — đã kiểm chứng còn khả dụng và hỗ trợ response_format json_object.
// Gặp `model_not_found` thì đổi qua env trước, chỉ sửa hằng số này khi mặc định chết hẳn.
const MODEL = (typeof process !== 'undefined' && process.env?.GROQ_MODEL) || 'openai/gpt-oss-120b'
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

// Netlify Function có trần thực thi ~26s -> mỗi lần gọi Groq tối đa 18s, và chỉ
// retry được ĐÚNG 1 lần (18s x 2 + backoff vẫn còn dư margin cho phần code còn lại).
// KHÔNG tăng MAX_RETRIES.
const REQUEST_TIMEOUT_MS = 18000
const MAX_RETRIES = 1
const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 4000

/** Lỗi gọi AI có `code` để client/hàm gọi phân loại (rate_limited/timeout/upstream/...). */
export class AiError extends Error {
  constructor(message, code = 'upstream') {
    super(message)
    this.name = 'AiError'
    this.code = code
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Thời gian chờ trước lần retry: ưu tiên header Retry-After, else exponential + jitter, có trần. */
function backoffDelay(attempt, retryAfterHeader) {
  const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0)
    return Math.min(retryAfterMs, MAX_BACKOFF_MS)
  const base = BASE_BACKOFF_MS * 2 ** attempt
  return Math.min(base + Math.random() * 300, MAX_BACKOFF_MS)
}

/**
 * Gửi 1 request chat/completions tới Groq với timeout + retry (429/5xx/mạng/timeout).
 * Trả về nội dung reply thô (string). Ném `AiError` với `code` phù hợp khi hết cách.
 *
 * `reasoningEffort`: các model reasoning (gpt-oss…) tiêu `max_tokens` cho phần suy luận
 * TRƯỚC khi sinh content — hết ngân sách giữa chừng thì `content` rỗng và request coi như
 * hỏng. Với task trích xuất, để 'low' vừa rẻ vừa để dành token cho câu trả lời. Model
 * không phải reasoning sẽ bỏ qua tham số này.
 * @param {{ messages: Array, temperature?: number, maxTokens?: number, json?: boolean, reasoningEffort?: 'low'|'medium'|'high' }} args
 * @param {string} key GROQ_API_KEY
 */
export async function groqRequest(
  { messages, temperature = 0.7, maxTokens = 400, json = false, reasoningEffort },
  key,
) {
  const body = { model: MODEL, messages, temperature, max_tokens: maxTokens }
  if (json) body.response_format = { type: 'json_object' }
  if (reasoningEffort) body.reasoning_effort = reasoningEffort

  let lastErr
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let res
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (e) {
      lastErr =
        e?.name === 'AbortError'
          ? new AiError('AI phản hồi quá lâu, thử lại nhé.', 'timeout')
          : new AiError('Không kết nối được tới máy chủ AI.', 'network')
      if (attempt < MAX_RETRIES) {
        await sleep(backoffDelay(attempt))
        continue
      }
      throw lastErr
    } finally {
      clearTimeout(timer)
    }

    if (res.ok) {
      const data = await res.json()
      const reply = data?.choices?.[0]?.message?.content || ''
      // finish_reason 'length' + content rỗng = model reasoning đã ăn hết max_tokens.
      // Phân biệt rõ để người sửa biết phải tăng maxTokens / hạ reasoningEffort, chứ không
      // đi soi mạng hay key.
      if (!reply) {
        const truncated = data?.choices?.[0]?.finish_reason === 'length'
        throw new AiError(
          truncated
            ? 'AI dùng hết ngân sách token cho phần suy luận. Tăng maxTokens hoặc đặt reasoningEffort thấp hơn.'
            : 'AI không trả về nội dung. Thử lại nhé.',
          'upstream',
        )
      }
      return reply.trim()
    }

    if (res.status === 429) {
      lastErr = new AiError(
        'Đã chạm giới hạn tốc độ Groq (429). Đợi vài giây rồi thử lại.',
        'rate_limited',
      )
      if (attempt < MAX_RETRIES) {
        await sleep(backoffDelay(attempt, res.headers?.get?.('retry-after')))
        continue
      }
      throw lastErr
    }
    if (res.status === 401)
      throw new AiError('GROQ_API_KEY không hợp lệ. Kiểm tra lại key ở console.groq.com.', 'config')
    if (res.status >= 500) {
      lastErr = new AiError(`AI đang gặp sự cố (Groq ${res.status}).`, 'upstream')
      if (attempt < MAX_RETRIES) {
        await sleep(backoffDelay(attempt))
        continue
      }
      throw lastErr
    }
    // 4xx khác (400 sai payload…): lỗi phía mình, retry không giúp được gì.
    const detail = await res.text().catch(() => '')
    throw new AiError(`Groq API ${res.status}: ${detail.slice(0, 200)}`, 'bad_request')
  }
  throw lastErr
}

/** Dựng { status, body } chuẩn hoá từ một lỗi AiError (hoặc Error thường) để trả về client. */
export function errorResponse(e) {
  const code = e?.code || 'upstream'
  const status =
    code === 'rate_limited'
      ? 429
      : code === 'timeout'
        ? 504
        : code === 'parse_failed'
          ? 422
          : code === 'bad_request'
            ? 400
            : code === 'config'
              ? 500
              : 502
  return { status, body: { error: { code, message: e?.message || 'Lỗi không xác định' } } }
}
