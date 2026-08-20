/**
 * POST /.netlify/functions/parse-expense
 *
 * Nhận một câu tiếng Việt tự nhiên, trả về mảng khoản chi ở dạng bản nháp cho
 * client hiển thị để user xác nhận. Hàm này KHÔNG ghi vào DB — parse ngôn ngữ
 * tự nhiên sẽ có lúc sai, và user sửa trên bảng nháp vẫn nhanh hơn dọn dữ liệu rác.
 *
 * Request:  { text, today: 'YYYY-MM-DD', categories: string[], defaultCurrency }
 * Response: { items: [{ amount, currency, category, note, spent_at, confidence }] }
 * Lỗi:      { error: { code, message } }
 */
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { AiError, groqRequest, errorResponse } from './_llm.js'

/** Cắt đầu vào quá dài: vừa chặn lạm dụng, vừa giữ prompt trong tầm token đã tính. */
const MAX_TEXT_LENGTH = 500
const MAX_CATEGORIES = 40
const CURRENCIES = ['VND', 'JPY', 'USD']

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const fail = (code, message, status) => json({ error: { code, message } }, status)

const requestSchema = z.object({
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categories: z.array(z.string().min(1)).min(1).max(MAX_CATEGORIES),
  /**
   * Danh mục THU. Để trống thì prompt không nhắc gì tới tiền vào và mọi dòng trả
   * về đều là 'expense' — giữ đúng hành vi cũ cho chỗ gọi chưa cập nhật.
   */
  incomeCategories: z.array(z.string().min(1)).max(MAX_CATEGORIES).default([]),
  defaultCurrency: z.enum(CURRENCIES).default('VND'),
})

/**
 * Hình dạng MỘT dòng model phải trả. `response_format: json_object` của Groq chỉ
 * đảm bảo cú pháp JSON hợp lệ, KHÔNG đảm bảo đúng schema — nên mọi dòng vẫn phải
 * đi qua đây, dòng nào hỏng thì loại bỏ chứ không trả về nửa vời.
 */
const itemSchema = z.object({
  amount: z.number().positive().finite(),
  currency: z.enum(CURRENCIES),
  category: z.string().min(1),
  note: z.string().max(120),
  spent_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: z.enum(['high', 'low']),
  // Model cũ / prompt không bật phần thu sẽ không trả field này. Mặc định
  // 'expense' là mặc định an toàn: đa số câu là tiền ra, và một khoản chi bị
  // nhận nhầm thành thu sẽ làm số dư sai theo hướng dễ chịu một cách giả tạo.
  kind: z.enum(['expense', 'income']).default('expense'),
})

const WEEKDAY_VI = ['Chủ Nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy']

/** Parse 'YYYY-MM-DD' ở UTC — dùng `new Date(str)` trần sẽ lệch ngày theo múi giờ máy chủ. */
function parseISODateUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function addDaysUTC(date, days) {
  return new Date(date.getTime() + days * 86400000)
}

/**
 * Bảng ngày tính SẴN bằng JS để nhét vào prompt.
 *
 * Model rất hay sai khi phải tự cộng trừ lịch: "thứ 3 tuần trước" từng ra
 * 2026-02-26 (một thứ Năm) thay vì 2026-03-03. Số học ngày tháng là việc của
 * code, không phải của model — model chỉ còn phải *chọn* đúng dòng trong bảng.
 */
function buildDateReference(today) {
  const base = parseISODateUTC(today)
  // Tuần bắt đầu từ thứ Hai, khớp với lịch tuần của app.
  const mondayOffset = (base.getUTCDay() + 6) % 7
  const thisMonday = addDaysUTC(base, -mondayOffset)
  const lastMonday = addDaysUTC(thisMonday, -7)

  const weekLine = (label, monday) =>
    [1, 2, 3, 4, 5, 6, 0]
      .map((dow, i) => `${WEEKDAY_VI[dow]} ${label} = ${toISO(addDaysUTC(monday, i))}`)
      .join('\n- ')

  return `- hôm nay = ${today} (${WEEKDAY_VI[base.getUTCDay()]})
- hôm qua / tối qua / đêm qua = ${toISO(addDaysUTC(base, -1))}
- hôm kia = ${toISO(addDaysUTC(base, -2))}
- ${weekLine('tuần này', thisMonday)}
- ${weekLine('tuần trước', lastMonday)}`
}

/**
 * Tên danh mục do user tự đặt và được nội suy thẳng vào system prompt, nên phải
 * cắt xuống một dòng: một danh mục đặt tên nhiều dòng có thể chèn thêm chỉ thị
 * vào giữa prompt. Cắt luôn độ dài để một tên rất dài không đẩy phần quy tắc ra
 * khỏi ngân sách token.
 */
function sanitizeCategoryName(name) {
  return name.replace(/[\r\n]+/g, ' ').trim().slice(0, 60)
}

function categoryBlock(names) {
  return names.map((c) => `- ${sanitizeCategoryName(c)}`).join('\n')
}

/**
 * Export để bộ test chất lượng (docs/test-cases-chi-tieu.md) chạy đúng prompt
 * đang deploy — prompt chép lại trong script test sẽ lệch ngay lần sửa đầu tiên.
 */
export function buildSystemPrompt({ today, categories, incomeCategories = [], defaultCurrency }) {
  const hasIncome = incomeCategories.length > 0

  // Không có danh mục thu thì không nhắc gì tới tiền vào: thêm một khái niệm vào
  // prompt mà không có chỗ để phân loại nó chỉ làm model đoán thêm.
  const incomeSection = hasIncome
    ? `
DANH MỤC THU CHO PHÉP (chỉ dùng khi kind = "income", chép đúng từng ký tự):
${categoryBlock(incomeCategories)}`
    : ''

  const incomeRule = hasIncome
    ? `
10. KIND — TIỀN RA hay TIỀN VÀO:
   - "expense" = tiền ra. Đây là mặc định và là phần lớn các câu.
   - "income" = tiền VÀO: lương, thưởng, tiền được trả, được chuyển khoản, bán
     được, hoàn tiền, lãi, cổ tức, cho thuê thu về.
     "nhận lương 20 triệu" -> kind "income".
     "được thưởng 2tr" -> kind "income".
   - kind "income" thì category BẮT BUỘC nằm trong DANH MỤC THU; kind "expense"
     thì nằm trong DANH MỤC CHO PHÉP. Không lấy chéo hai danh sách.
   - Không chắc chắn là tiền vào thì để "expense".
   - Một câu có thể có cả hai: "nhận lương 20tr, trả tiền nhà 5tr" -> một dòng
     income và một dòng expense.`
    : ''

  return `Bạn là bộ trích xuất khoản thu chi từ câu tiếng Việt đời thường. Chỉ trích xuất, không bình luận, không khuyên nhủ.

BẢNG NGÀY THAM CHIẾU (đã tính sẵn — dùng đúng các giá trị này, không tự tính lại):
${buildDateReference(today)}

DANH MỤC CHO PHÉP (chỉ được chọn trong đây, chép đúng từng ký tự):
${categoryBlock(categories)}${incomeSection}
ĐƠN VỊ TIỀN MẶC ĐỊNH: ${defaultCurrency}

Trả về DUY NHẤT một JSON object dạng:
{"items":[{"amount":<số nguyên hoặc số thực>,"currency":"VND|JPY|USD","category":"<một tên trong danh sách trên>","note":"<ghi chú ngắn>","spent_at":"YYYY-MM-DD","confidence":"high|low"${hasIncome ? ',"kind":"expense|income"' : ''}}]}

QUY TẮC:

1. MỘT CÂU THƯỜNG CÓ NHIỀU KHOẢN — tách hết thành nhiều phần tử.
   "sáng ăn bún 40k, trưa cà phê 35k, tối đổ xăng 100k" -> 3 phần tử.

2. CHUẨN HOÁ SỐ TIỀN về số đầy đủ, không giữ hậu tố:
   - "40k" / "40 nghìn" / "40 ngàn" / "bốn mươi nghìn" -> 40000
   - "2 triệu" / "2tr" / "2 củ" -> 2000000
   - "3 xị" -> 300000 (1 xị = 100000)
   - "rưỡi" = CỘNG THÊM MỘT NỬA của đơn vị vừa nói, KHÔNG phải cộng thêm nguyên
     một đơn vị. Tính ra thành phép cộng rồi mới trả về:
       "hai trăm rưỡi"  = 200 + 50  = 250 nghìn -> 250000  (KHÔNG phải 300000)
       "1 triệu rưỡi"   = 1000000 + 500000      -> 1500000 (KHÔNG phải 2000000)
       "ba chục rưỡi"   = 30 + 5    = 35 nghìn  -> 35000   (KHÔNG phải 40000)
   - SỐ VIẾT BẰNG CHỮ mà không kèm "nghìn/ngàn/triệu" thì ngầm hiểu là NGHÌN —
     người Việt nói tiền hằng ngày luôn lược chữ "nghìn":
     "hai trăm" -> 200000, "hai trăm rưỡi" -> 250000, "năm chục" -> 50000.
   - SỐ VIẾT BẰNG CHỮ SỐ mà không kèm đơn vị nào ("mua đồ 500") thì KHÔNG tự
     nhân lên: giữ nguyên 500 và đặt confidence "low" để người dùng tự sửa.

3. CATEGORY BẮT BUỘC nằm trong DANH MỤC CHO PHÉP, chép nguyên văn. Không khớp
   được thì chọn "Khác" (hoặc mục cuối danh sách nếu không có "Khác").
   TUYỆT ĐỐI không tự nghĩ ra danh mục mới.
   Một số cách nói hay gặp:
   - grab / xe ôm / taxi / be / gojek / vé xe / vé tàu / vé máy bay / đổ xăng /
     gửi xe / vé gửi xe -> Di chuyển
   - grabfood / shopeefood / baemin / đặt đồ ăn / cà phê / trà sữa / nhậu /
     ăn sáng, trưa, tối -> Ăn uống
   - tiền nhà / tiền trọ / điện / nước / internet / wifi / rác -> Nhà cửa
   - thuốc / khám / bệnh viện / nha khoa / bảo hiểm y tế -> Sức khoẻ
   Chữ "grab" đứng một mình LUÔN là đi lại, chỉ tính vào Ăn uống khi có
   "grabfood" hoặc rõ ràng là đặt đồ ăn.

4. NGÀY: dùng ĐÚNG các giá trị trong BẢNG NGÀY THAM CHIẾU ở trên, chép nguyên
   văn, KHÔNG tự cộng trừ lịch.
   - không nói gì về thời gian -> ${today}
   - "mùng 5" / "ngày 5" -> ngày 5 của tháng hiện tại; nếu ngày đó còn ở tương
     lai so với hôm nay thì lấy tháng trước
   Luôn trả về định dạng YYYY-MM-DD, và KHÔNG BAO GIỜ trả ngày trong tương lai.

5. KHÔNG SUY RA ĐƯỢC SỐ TIỀN thì BỎ HẲN khoản đó. Không đoán bừa, không đặt 0.

6. CÂU KHÔNG PHẢI CHI TIÊU (nhắc việc, lịch hẹn, cảm xúc) -> {"items":[]}.

7. confidence:
   - "high": số tiền và món chi đều rõ ràng.
   - "low": mơ hồ (số tiền không rõ đơn vị, ngày không chắc, không rõ danh mục).

8. note: ngắn gọn, GIỮ NGUYÊN từ người dùng dùng ("bún bò", "grab về nhà").
   Không thêm chữ, không viết hoa lại, không dịch.

9. currency: mặc định ${defaultCurrency}. Chỉ đổi khi câu nói rõ ("500 yên" -> JPY,
   "20 đô" -> USD).
${incomeRule}

VÍ DỤ (giả sử HÔM NAY LÀ 2026-03-10):

Input: "sáng ăn bún 40k, trưa cà phê 35 nghìn, hôm qua đổ xăng 100k"
Output: {"items":[
{"amount":40000,"currency":"VND","category":"Ăn uống","note":"ăn bún","spent_at":"2026-03-10","confidence":"high"},
{"amount":35000,"currency":"VND","category":"Ăn uống","note":"cà phê","spent_at":"2026-03-10","confidence":"high"},
{"amount":100000,"currency":"VND","category":"Di chuyển","note":"đổ xăng","spent_at":"2026-03-09","confidence":"high"}]}

Input: "nhắc tôi họp lúc 3h chiều"
Output: {"items":[]}

Input: "mua cái áo, quên mất giá rồi"
Output: {"items":[]}${
    hasIncome
      ? `

Input: "nhận lương tháng này 20 triệu, đóng tiền nhà 5tr"
Output: {"items":[
{"amount":20000000,"currency":"VND","category":"${sanitizeCategoryName(incomeCategories[0])}","note":"lương tháng này","spent_at":"2026-03-10","confidence":"high","kind":"income"},
{"amount":5000000,"currency":"VND","category":"Nhà cửa","note":"tiền nhà","spent_at":"2026-03-10","confidence":"high","kind":"expense"}]}`
      : ''
  }`
}

/**
 * Model đôi khi bọc JSON trong text ("Đây là kết quả: {...}"). Thử parse thẳng,
 * hỏng thì cắt từ `{` đầu tới `}` cuối rồi parse lại — sai một lần nữa mới bỏ cuộc.
 */
function parseJsonLoose(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(raw.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

export default async (req) => {
  try {
    if (req.method !== 'POST') return fail('bad_request', 'Chỉ nhận POST.', 405)

    // --- Xác thực: endpoint này tiêu quota key của mình và nhận dữ liệu tài
    // chính cá nhân, nên KHÔNG để mở như một endpoint chat thông thường. ---
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return fail('auth', 'Thiếu token đăng nhập.', 401)

    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
    const groqKey = process.env.GROQ_API_KEY
    if (!supabaseUrl || !supabaseAnonKey || !groqKey) {
      return fail('config', 'Server chưa cấu hình đủ biến môi trường.', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return fail('auth', 'Phiên đăng nhập không hợp lệ.', 401)

    // --- Payload ---
    const body = await req.json().catch(() => null)
    const parsedRequest = requestSchema.safeParse(body)
    if (!parsedRequest.success) {
      return fail(
        'bad_request',
        `Dữ liệu gửi lên không hợp lệ (tối đa ${MAX_TEXT_LENGTH} ký tự).`,
        400,
      )
    }
    const { text, today, categories, incomeCategories, defaultCurrency } = parsedRequest.data

    // --- Gọi model ---
    const reply = await groqRequest(
      {
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt({
              today,
              categories,
              incomeCategories,
              defaultCurrency,
            }),
          },
          { role: 'user', content: text },
        ],
        temperature: 0,
        // Đây là task trích xuất, không cần suy luận dài; nhưng model reasoning
        // vẫn tiêu max_tokens cho phần suy luận TRƯỚC khi sinh content, nên ngân
        // sách phải rộng hơn con số cần cho riêng JSON (~800 cho 10 khoản).
        maxTokens: 2000,
        reasoningEffort: 'low',
        json: true,
      },
      groqKey,
    )

    const parsed = parseJsonLoose(reply)
    if (!parsed || !Array.isArray(parsed.items)) {
      throw new AiError('AI trả về dữ liệu không đọc được.', 'parse_failed')
    }

    // Lọc từng dòng: sai schema, hoặc category ngoài danh sách của ĐÚNG kind đó
    // -> bỏ dòng. Allowlist phải theo kind, không phải hợp của hai danh sách:
    // gộp lại thì một khoản chi vẫn gán được danh mục "Lương" và số dư sẽ sai.
    // Thà trả ít dòng đúng còn hơn một dòng sai lọt vào bảng nháp rồi được lưu.
    const allowedByKind = {
      expense: new Set(categories),
      income: new Set(incomeCategories),
    }
    const items = parsed.items
      .map((item) => itemSchema.safeParse(item))
      .filter((r) => r.success)
      .map((r) => r.data)
      .filter((item) => allowedByKind[item.kind].has(item.category))

    if (items.length === 0) {
      // Mảng rỗng ngay từ model là câu trả lời hợp lệ ("nhắc tôi họp 3h") — chỉ
      // báo lỗi khi model CÓ trả dòng nhưng không dòng nào qua được validate.
      if (parsed.items.length > 0) {
        throw new AiError('Không đọc được khoản chi nào từ câu này.', 'parse_failed')
      }
      return json({ items: [] })
    }

    return json({ items })
  } catch (e) {
    const { status, body } = errorResponse(e)
    return json(body, status)
  }
}
