# Kế hoạch: Module Quản lý chi tiêu bằng AI

> Tài liệu này để giao cho AI phát triển. Làm **tuần tự từ Bước 0**, mỗi bước có
> "Tiêu chí xong" — không sang bước sau khi bước hiện tại chưa đạt.

## 0. Bối cảnh & quyết định kiến trúc

**Mục tiêu:** người dùng nói/nhập một câu tiếng Việt tự nhiên ("sáng ăn bún 40k,
trưa cà phê 35 nghìn"), AI tách thành các khoản chi có số tiền / danh mục / ngày,
người dùng bấm xác nhận một nhát là lưu. Có báo cáo tổng theo tháng và theo danh mục.

**Các quyết định đã chốt — không thay đổi khi triển khai:**

| Quyết định | Lý do |
|---|---|
| Tích hợp vào repo `WeeklyScheduler`, **không tạo project riêng** | Dùng lại auth, profiles, i18n 4 ngôn ngữ, 6 theme, PWA, Netlify pipeline, shadcn/ui đã hoàn thiện |
| Cùng Supabase project, thêm bảng mới | Cùng `auth.uid()`, cùng RLS pattern, không phải quản lý 2 DB |
| Route mới `/expenses` trong `ProtectedRoute` | Một lần đăng nhập, một icon PWA |
| Gọi AI qua **Netlify Function**, không gọi từ browser | `GROQ_API_KEY` tuyệt đối không được vào bundle client |
| Provider: **Groq** (API tương thích OpenAI) | Đã có key, đã có code `_llm.js` chạy production ở project `Devleap` |
| AI trả **bản nháp để user xác nhận**, không tự ghi DB | Parse tiếng Việt tự nhiên sẽ có lúc sai; xác nhận 1 nhát vẫn nhanh hơn nhập form |
| Bảng `expense_categories` **riêng**, không thêm cột vào `categories` | `categories` đang có `unique(user_id, name)` + trigger seed 6 danh mục công việc lúc signup; nhồi thêm loại chi tiêu phải sửa cả constraint lẫn trigger |

**Nguồn tham chiếu (đọc trước khi code):**
- `C:\Users\Admin\Desktop\Longlm\Devleap\netlify\functions\_llm.js` — hàm `groqRequest()`, `AiError`, `errorResponse()`
- `C:\Users\Admin\Desktop\Longlm\Devleap\netlify\functions\chat.js` — khung Netlify Function v2
- `C:\Users\Admin\Desktop\Longlm\Devleap\vite.config.js` — plugin `configureServer` giả lập function trong dev
- `supabase/migrations/0001_init.sql` — RLS pattern, trigger `set_updated_at`
- `src/features/tasks/api/tasksApi.ts` — convention tầng api
- `src/features/categories/` — convention một feature đầy đủ (api/hooks/components/schemas)

---

## Bước 0 — Hạ tầng gọi AI (chưa có UI)

**Mục tiêu:** gọi được Groq từ một Netlify Function, chạy cả ở `npm run dev` và trên Netlify.

### 0.1 Biến môi trường

Thêm vào `.env.example` (và `.env.local` với giá trị thật):

```
# --- AI phân tích chi tiêu (Groq) ---
# Key MIỄN PHÍ tại https://console.groq.com/keys — KHÔNG có tiền tố VITE_
# để Vite không đưa vào bundle client.
GROQ_API_KEY=
# Để trống = dùng mặc định trong code.
GROQ_MODEL=
```

> ⚠️ **Không đặt tên là `VITE_GROQ_API_KEY`.** Mọi biến `VITE_*` đều bị nhúng vào
> bundle và ai xem source cũng đọc được.

Kiểm tra `.gitignore` đã bỏ qua `.env.local` (hiện có rồi — xác nhận lại).

Trên Netlify: **Site settings → Environment variables** thêm `GROQ_API_KEY`.

### 0.2 Copy lõi gọi Groq

Tạo `netlify/functions/_llm.js`, copy từ `Devleap/netlify/functions/_llm.js` nhưng
**chỉ lấy 4 thứ sau**, bỏ toàn bộ phần luyện tiếng Anh (PERSONAS, runChat, ...):

- `class AiError`
- `sleep()`, `backoffDelay()`
- `groqRequest({ messages, temperature, maxTokens, json }, key)`
- `errorResponse(e)`

Giữ nguyên các hằng số: `REQUEST_TIMEOUT_MS = 18000`, `MAX_RETRIES = 1` (Netlify
Function trần ~26s, đã tính margin), backoff tôn trọng header `Retry-After`.

Đổi model mặc định cho phù hợp task extraction:

```js
const MODEL = process.env?.GROQ_MODEL || 'llama-3.3-70b-versatile'
```

> `llama-3.3-70b-versatile` là model đang chạy thật ở Devleap nên chắc chắn còn
> khả dụng với key này. Groq có đổi danh sách model theo thời gian — nếu gặp lỗi
> `model_not_found`, kiểm tra danh sách hiện hành tại console.groq.com rồi đổi
> qua env `GROQ_MODEL`, **không sửa code**.

### 0.3 Plugin Vite giả lập function trong dev

Sửa `vite.config.ts` theo đúng cách Devleap làm (`configureServer` + `server.middlewares.use('/.netlify/functions/<name>')`), để `npm run dev` gọi được function mà không cần `netlify dev`.

Hai điểm bắt buộc:
1. `loadEnv(mode, cwd, '')` — **prefix rỗng** để nạp cả biến không có tiền tố `VITE_` (tức `GROQ_API_KEY`) cho plugin dev.
2. Chỉ nạp trong dev, không để lọt vào `define` của bundle production.

### 0.4 Khai báo functions directory

`netlify.toml` hiện chưa có block `[functions]`. Thêm:

```toml
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

**Tiêu chí xong:** tạo tạm `netlify/functions/ai-ping.js` gọi `groqRequest` với 1 prompt "trả về đúng chữ OK". `curl` vào `http://localhost:5173/.netlify/functions/ai-ping` trả về `OK`. Sau đó **xoá file tạm này**.

---

## Bước 1 — Database

**Mục tiêu:** có bảng + RLS + danh mục mặc định, dùng được ngay cả khi chưa có AI.

Tạo `supabase/migrations/0009_add_expenses.sql`.

### 1.1 Bảng `expense_categories`

```sql
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  emoji text not null default '💸',
  color text not null check (color ~* '^#[0-9a-f]{6}$'),
  monthly_budget numeric(14,2) check (monthly_budget is null or monthly_budget > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists expense_categories_user_idx
  on public.expense_categories (user_id, sort_order);
```

`monthly_budget` NULL = không đặt hạn mức.

### 1.2 Bảng `expenses`

```sql
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'VND' check (currency in ('VND','JPY','USD')),
  note text not null default '',
  spent_at date not null,
  source text not null default 'ai' check (source in ('ai','manual')),
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, spent_at desc);
create index if not exists expenses_category_idx
  on public.expenses (category_id);
```

Hai cột dễ bị bỏ qua nhưng **phải có**:
- **`raw_text`** — câu gốc người dùng nói. Khi AI parse sai, hoặc sau này muốn đổi
  model/prompt và chạy lại toàn bộ, đây là dữ liệu duy nhất còn để sửa. Không lưu là mất vĩnh viễn.
- **`currency` từng dòng** — không quy đổi khi lưu, không gộp. Báo cáo phải tách theo currency.

`amount` dùng `numeric`, **không dùng** `float`/`double` (sai số tiền tệ).

### 1.3 RLS

Bật RLS cho cả 2 bảng, 4 policy mỗi bảng (select/insert/update/delete) với điều kiện
`auth.uid() = user_id` — copy y nguyên pattern của `tasks` trong `0001_init.sql`.

Gắn trigger `set_updated_at` (đã tồn tại từ `0001_init.sql`) cho cả 2 bảng.

### 1.4 Seed danh mục mặc định — **cả user mới và user hiện có**

Trigger seed trong `0001_init.sql` chỉ chạy khi có row mới trong `auth.users`.
Tài khoản của bạn **đã tồn tại** nên trigger mới sẽ không bao giờ chạy cho nó.
Phải làm cả hai:

1. Một function `seed_expense_categories(uid uuid)` insert bộ mặc định:
   `🍜 Ăn uống`, `🚗 Di chuyển`, `🏠 Nhà cửa`, `🛒 Mua sắm`, `💊 Sức khoẻ`,
   `🎮 Giải trí`, `📦 Khác` — mỗi cái một màu hex.
2. Gọi function đó **cho mọi user đang có** trong cùng migration:
   ```sql
   insert into ... select ... from public.profiles p
   where not exists (select 1 from public.expense_categories c where c.user_id = p.id);
   ```
3. Sửa/bổ sung trigger `on auth.users insert` để gọi luôn function này cho user mới.

**Tiêu chí xong:** chạy migration trên Supabase SQL editor không lỗi; đăng nhập bằng tài khoản hiện có và `select * from expense_categories` trả về 7 dòng; thử `select * from expenses` bằng tài khoản khác không thấy dữ liệu của nhau.

### 1.5 Cập nhật types

Sinh lại `src/lib/supabase/database.types.ts` để có 2 bảng mới (theo cách repo đang sinh types — kiểm tra `scripts/`).

---

## Bước 2 — Route, điều hướng, i18n, CRUD tay

**Mục tiêu:** module chi tiêu **dùng được hoàn chỉnh mà chưa cần AI**. Đây là nền để test AI ở Bước 3, và là phương án dự phòng khi AI lỗi/hết quota.

### 2.1 Cấu trúc feature

Theo đúng convention `src/features/*`:

```
src/features/expenses/
  api/expensesApi.ts            # theo pattern src/features/tasks/api/tasksApi.ts
  api/expenseCategoriesApi.ts
  hooks/useExpenses.ts
  hooks/useExpenseMutations.ts
  hooks/useExpenseCategories.ts
  components/ExpenseList.tsx
  components/ExpenseRow.tsx
  components/ExpenseEditForm.tsx   # nhập/sửa tay
  schemas/expenseSchema.ts         # zod
  index.ts
src/pages/ExpensesPage.tsx
```

Tầng api: hàm thuần async gọi `supabase`, `throw error`, export type `Row/Insert/Update` từ `Database` — **giống hệt** `tasksApi.ts`, không phát minh pattern mới.

### 2.2 Router

`src/app/router.tsx`: thêm route lazy `/expenses` **bên trong** `<Route element={<ProtectedRoute />}>`.

### 2.3 Điều hướng

`src/features/layout/components/Sidebar.tsx` hiện chỉ có mini-calendar + danh sách
category, **chưa có khái niệm chuyển module**. Cần:
- Thêm một nav switcher ở phần trên sidebar: `Lịch tuần` / `Chi tiêu`.
- Sidebar đang nhận `categories`, `miniCalendar`... qua props từ `SchedulerPage`.
  Khi ở `/expenses` thì mini-calendar và danh sách category công việc **không còn đúng ngữ cảnh** —
  làm các prop này optional và ẩn khi không có, hoặc truyền bộ nội dung riêng cho trang chi tiêu.
- `MobileActionBar.tsx`: kiểm tra và thêm entry tương ứng cho mobile.

### 2.4 i18n

Thêm key mới cho **cả 4 file** `src/features/i18n/locales/{vi,en,zh,ja}.ts`, giữ đúng
cấu trúc nested hiện có. Không hard-code chữ tiếng Việt trong component.

Nhóm key cần có: nav, tên 7 danh mục mặc định (xem `defaultCategoryNames.ts` để theo
cách repo đã dịch tên danh mục), nhãn form, thông báo lỗi AI, nhãn báo cáo.

### 2.5 Định dạng tiền

Tạo `src/lib/utils/formatMoney.ts`: `Intl.NumberFormat` theo `currency` của từng dòng
(`VND` không có phần thập phân, `JPY` cũng không, `USD` có 2 số). Locale lấy từ
`LocaleContext` hiện có.

**Tiêu chí xong:** vào `/expenses`, thêm/sửa/xoá được khoản chi bằng form tay, danh sách
hiển thị đúng định dạng tiền, đổi 4 ngôn ngữ không còn chữ lọt, `npm run typecheck` và
`npm run lint` sạch.

---

## Bước 3 — Netlify Function phân tích tiếng Việt

**Mục tiêu:** `POST /.netlify/functions/parse-expense` nhận câu tiếng Việt, trả về mảng khoản chi.

Tạo `netlify/functions/parse-expense.js` (Netlify Functions v2: `export default async (req) => Response`).

### 3.1 Xác thực người dùng — **bắt buộc, khác Devleap**

`chat.js` của Devleap là endpoint mở. Ở đây **không được** làm vậy: endpoint này tiêu
quota key của bạn và nhận dữ liệu tài chính cá nhân.

```js
const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
if (!token) return json({ error: { code: 'auth', message: '...' } }, 401)

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
const { data: { user }, error } = await supabase.auth.getUser(token)
if (error || !user) return json({ error: { code: 'auth', message: '...' } }, 401)
```

(Biến `VITE_*` vẫn đọc được trong function ở runtime — Netlify cấp mọi env var cho
function bất kể tiền tố. Chỉ có phía *client* là bị giới hạn bởi tiền tố.)

Client gọi kèm token lấy từ `supabase.auth.getSession()`.

### 3.2 Payload

```
Request:  { text: string, today: 'YYYY-MM-DD', categories: string[], defaultCurrency: 'VND' }
Response: { items: [{ amount, currency, category, note, spent_at, confidence }] }
Lỗi:      { error: { code, message } }   // dùng errorResponse() từ _llm.js
```

`categories` và `today` do **client truyền lên**, không hard-code trong function —
danh mục là của riêng từng user và có thể đổi.

### 3.3 System prompt

Viết bằng tiếng Việt, đặt trong một hằng số riêng. Phải nêu rõ các quy tắc sau
(đây là phần quyết định độ chính xác, đừng viết ngắn):

- Trả **mảng** `items` — một câu thường có nhiều khoản: *"sáng ăn bún 40k, trưa cà phê 35k, tối đổ xăng 100k"* → 3 khoản.
- Chuẩn hoá số tiền về **số nguyên đầy đủ**: `40k` / `40 nghìn` / `40 ngàn` / `bốn mươi nghìn` → `40000`; `2 triệu` / `2tr` → `2000000`; `hai trăm rưỡi` → `250000`; `3 xị` → `300000`.
- `category` **phải** là một giá trị trong danh sách `categories` được cung cấp. Không khớp được thì chọn `Khác`, **không tự tạo danh mục mới**.
- Ngày tương đối tính theo `today`: `hôm nay` / `hôm qua` / `thứ 3 tuần trước` / `mùng 5`. Không nêu ngày → dùng `today`.
- Không suy ra được số tiền thì **bỏ khoản đó**, không đoán bừa.
- `confidence`: `high` | `low`. `low` khi câu mơ hồ — client sẽ tô màu cảnh báo để user để ý.
- `note` ngắn gọn, giữ nguyên từ user dùng ("bún bò", "grab về nhà").

### 3.4 Ràng buộc JSON — điểm khác Anthropic, dễ sai

Groq hỗ trợ `response_format: { type: 'json_object' }` (đã có sẵn qua tham số `json: true`
của `groqRequest`). **Nó chỉ đảm bảo JSON hợp lệ, KHÔNG đảm bảo đúng schema** — model
vẫn có thể trả thiếu field, sai kiểu, hoặc `category` ngoài danh sách.

Vì vậy **bắt buộc**:
1. Bật `json: true` khi gọi `groqRequest`.
2. Mô tả rõ hình dạng JSON mong muốn **trong system prompt** (kèm 2–3 ví dụ input → output).
3. **Validate bằng zod ở phía function** trước khi trả về client (repo đã có `zod ^4.4.3`).
   Dòng nào không qua validate thì loại bỏ, không trả nửa vời.
4. Nếu sau validate không còn dòng nào → trả lỗi `{ code: 'parse_failed' }` để UI mời user nhập tay.
5. Xử lý trường hợp model bọc JSON trong text: `JSON.parse` thất bại thì cắt từ `{` đầu đến `}` cuối rồi parse lại (Devleap đã làm, xem quanh dòng 836 của `_llm.js` gốc).

`temperature`: dùng `0` hoặc `0.1` — đây là task trích xuất, không cần sáng tạo.
`maxTokens`: ~800 là đủ cho ~10 khoản.

### 3.5 Chặn lạm dụng

- Giới hạn độ dài `text` đầu vào (ví dụ 500 ký tự) — cắt/từ chối nếu dài hơn.
- Lỗi 429 từ Groq đã được `groqRequest` retry 1 lần rồi trả `code: 'rate_limited'`; UI phải hiện thông báo dễ hiểu + nút thử lại, **không** hiện lỗi thô.

**Tiêu chí xong:** `curl` với `{"text":"sáng ăn bún 40k, trưa cà phê 35 nghìn, hôm qua đổ xăng 100k", ...}` trả về 3 item, số tiền `40000/35000/100000`, `spent_at` của khoản xăng là ngày hôm trước. Gọi không có token → 401.

---

## Bước 4 — UI nhập nhanh + xác nhận

**Mục tiêu:** vòng lặp chính: nói/nhập → xem nháp → xác nhận → đã lưu.

### 4.1 Component

```
src/features/expenses/components/QuickAddSheet.tsx   # ô nhập + nút gửi + trạng thái loading
src/features/expenses/components/ParsedDraftList.tsx # bảng nháp: sửa được từng dòng
src/features/expenses/api/parseExpenseApi.ts         # fetch tới function, kèm Bearer token
```

### 4.2 Luồng

1. User nhập/nói → bấm gửi.
2. Gọi `parse-expense`, hiện skeleton (Groq thường 1–3s).
3. Hiện bảng nháp: mỗi dòng có số tiền / danh mục (select) / ghi chú / ngày — **sửa được tại chỗ**, xoá được từng dòng.
4. Dòng `confidence: 'low'` tô nền cảnh báo nhẹ.
5. Bấm "Lưu tất cả" → một lần `insert` nhiều dòng (theo pattern `bulkCreateTasks` đã có trong `tasksApi.ts`), kèm `source: 'ai'` và `raw_text` = câu gốc.
6. Lỗi AI → hiện message thân thiện + nút "Nhập tay" mở form của Bước 2.

**Không tự động lưu khi chưa xác nhận** — đây là quyết định thiết kế, không phải chi tiết
tuỳ chọn. Vừa tránh rác dữ liệu, vừa cho user sửa nhanh.

### 4.3 Chống gửi trùng

Nút gửi phải disable trong lúc đang chờ; nút "Lưu tất cả" disable sau khi bấm.
Người dùng bấm 2 lần trên mạng chậm là lỗi hay gặp nhất.

**Tiêu chí xong:** nhập câu 3 khoản → thấy 3 dòng nháp → sửa 1 danh mục → lưu → danh sách chi tiêu có đúng 3 dòng với `source='ai'` và `raw_text` khớp câu gốc.

---

## Bước 5 — Báo cáo

**Mục tiêu:** trả lời được "tháng này tiêu bao nhiêu, vào những gì".

`src/features/expenses/components/MonthlyReport.tsx`:

- Chọn tháng (mặc định tháng hiện tại).
- Tổng chi tháng, **tách theo `currency`** — không gộp VND với JPY.
- Bảng theo danh mục: tổng tiền, % trên tổng, thanh tiến độ so với `monthly_budget` (nếu có), tô đỏ khi vượt.
- So sánh với tháng trước (tăng/giảm %).

**Tính toán ở client** bằng dữ liệu đã fetch qua TanStack Query — dữ liệu chi tiêu cá nhân
mỗi tháng chỉ vài trăm dòng, chưa cần view/RPC phía Postgres. Chỉ tối ưu khi thực sự chậm.

Query key phải chứa tháng để cache đúng; repo đã có `@tanstack/query-async-storage-persister`
nên báo cáo sẽ tự hoạt động offline.

**Tiêu chí xong:** báo cáo khớp với tổng tính tay từ dữ liệu trong DB; đổi tháng thấy số đổi; danh mục có `monthly_budget` hiển thị đúng trạng thái vượt/chưa vượt.

---

## Bước 6 — Nhập bằng giọng nói

**Làm sau cùng, và phải coi nhập chữ là đường chính.**

Web Speech API (`webkitSpeechRecognition`, `lang: 'vi-VN'`) chạy tốt trên Chrome
Android và Chrome desktop, nhưng **trên Safari/iOS thì hỗ trợ chắp vá và hay thất bại**.
Devleap đã gặp đúng vấn đề này (`speakInto` trong ghi chú kế hoạch của họ).

Yêu cầu:
- Detect khả năng hỗ trợ, không hỗ trợ thì **ẩn nút mic** — không hiện nút bấm rồi báo lỗi.
- Luôn có ô nhập chữ song song. **Không được** làm UI chỉ có mic.
- Kết quả nhận diện đổ vào ô nhập để user sửa trước khi gửi, không gửi thẳng lên AI.

**Tiêu chí xong:** trên Chrome Android nói được và ra chữ; trên thiết bị không hỗ trợ, UI vẫn dùng bình thường qua ô nhập chữ.

---

## Bước 7 — Tuỳ chọn, làm khi đã ổn định

| Việc | Ghi chú |
|---|---|
| Quản lý danh mục chi tiêu (thêm/sửa/xoá/đặt hạn mức) | Copy pattern `CategoryManagerModal.tsx` đã có |
| Xuất CSV theo tháng | Sinh phía client, không cần server |
| Chi tiêu định kỳ (tiền nhà, internet) | Repo đã có logic `series` cho task lặp ở migration `0005` — tham khảo |
| Đổi model Groq | Chỉ đổi env `GROQ_MODEL`, chạy lại bộ test ở mục "Đánh giá chất lượng" |

---

## Đánh giá chất lượng AI (làm ở Bước 3, đừng bỏ)

Tạo `docs/test-cases-chi-tieu.md` với **ít nhất 30 câu tiếng Việt thật** của chính bạn,
kèm kết quả mong đợi. Bắt buộc phủ các trường hợp:

- Nhiều khoản trong một câu
- `k` / `nghìn` / `ngàn` / `triệu` / `tr` / `xị` / `rưỡi` / số viết bằng chữ
- Ngày tương đối: hôm qua, tối qua, thứ 3 tuần trước, mùng 5
- Câu thiếu số tiền (phải bị bỏ, không được đoán)
- Câu không phải chi tiêu ("nhắc tôi họp 3h chiều") → trả mảng rỗng
- Danh mục không rõ → rơi vào `Khác`
- Tiền JPY nếu bạn có chi tiêu ở Nhật

Chạy bộ này mỗi khi sửa system prompt hoặc đổi model. Đây là thứ duy nhất cho biết
prompt mới tốt hơn hay tệ hơn.

---

## Rủi ro & cách xử lý

| Rủi ro | Xử lý |
|---|---|
| `GROQ_API_KEY` lọt vào bundle client | Không đặt tiền tố `VITE_`. Sau khi build, `grep -r "gsk_" dist/` phải **không** ra kết quả. Kiểm tra việc này ở Bước 0. |
| Groq free tier 429 | `groqRequest` đã retry + tôn trọng `Retry-After`. UI hiện thông báo dễ hiểu + nút nhập tay. |
| Groq đổi/khai tử model | Model đặt qua env `GROQ_MODEL`, không hard-code ở nhiều nơi. |
| Model trả JSON đúng cú pháp nhưng sai schema | Validate zod phía function, loại dòng lỗi (Bước 3.4). Đây là hạn chế của `json_object`, không phải bug. |
| Netlify Function timeout | `groqRequest` giới hạn 18s/lần, retry đúng 1 lần — đã tính cho trần ~26s. **Không tăng `MAX_RETRIES`.** |
| Endpoint bị lạm dụng | Verify JWT (Bước 3.1) + giới hạn độ dài input. |
| Sai số tiền do float | `numeric(14,2)` trong DB; phía JS xử lý tiền VND như số nguyên. |
| Sidebar hỏng khi ở `/expenses` | Xử lý ở Bước 2.3 — làm prop optional, đừng để crash. |
| Trigger seed không chạy cho user hiện có | Backfill trong migration (Bước 1.4). Rất dễ bỏ sót. |

---

## Nhật ký triển khai

### 2026-08-19 — B0 đến B4

**Model mặc định đã đổi: `llama-3.3-70b-versatile` -> `openai/gpt-oss-120b`.**
Họ llama-3.3 đã biến mất khỏi `/v1/models` của key này (`model_not_found`), nên
mặc định cũ chết hẳn chứ không phải trục trặc tạm thời — sửa hằng số trong
`_llm.js` chứ không chỉ đặt env. Danh sách model còn dùng được lấy bằng
`curl https://api.groq.com/openai/v1/models`.

Hệ quả kèm theo: gpt-oss là **model reasoning**, nó tiêu `max_tokens` cho phần
suy luận TRƯỚC khi sinh `content`. Ngân sách 800 token trong kế hoạch không đủ
và biểu hiện ra là "AI không trả về nội dung". Đã xử lý ở tầng hạ tầng:
`groqRequest` nhận thêm `reasoningEffort` ('low' cho task trích xuất) và báo
lỗi riêng khi `finish_reason === 'length'` mà content rỗng; `parse-expense`
dùng `maxTokens: 2000`.

**Bảng ngày tính sẵn.** Model sai nặng khi phải tự cộng trừ lịch
("thứ 3 tuần trước" ra lệch một tuần rưỡi). `buildDateReference()` dựng sẵn
bảng ngày bằng JS rồi nhét vào prompt — số học ngày tháng là việc của code.
Chi tiết trong `docs/test-cases-chi-tieu.md`.

### 2026-08-19 — B5 (báo cáo tháng)

**Không có bộ chọn tháng riêng.** Kế hoạch ghi "chọn tháng (mặc định tháng hiện
tại)", nhưng header của trang đã có sẵn ‹ › + "Hôm nay". Thêm bộ chọn thứ hai
trong báo cáo thì hai chỗ sẽ lệch nhau và người đọc không biết con số đang là
của tháng nào. `MonthlyReport` nhận `month` từ trang, và danh sách / báo cáo
tách thành hai tab (`ExpenseTabs`) dùng chung tháng đó.

**Hạn mức chỉ đối chiếu trong `DEFAULT_CURRENCY` (VND).** Cột
`expense_categories.monthly_budget` là `numeric` không kèm currency, nên nó chỉ
có nghĩa khi hiểu ngầm là tiền mặc định. So 1.200 ¥ với hạn mức 400.000 (VND) sẽ
ra "chưa vượt" một cách sai lệch, nên khối JPY/USD không hiện thanh hạn mức.
Muốn đặt hạn mức theo nhiều đơn vị thì phải thêm cột currency vào bảng trước —
ghi lại ở chú thích của `DEFAULT_CURRENCY` trong `schemas/expenseSchema.ts`.

**`change = null` khi tháng trước bằng 0.** Chia cho 0 ra `Infinity`; "tăng vô
hạn %" không phải thông tin dùng được, nên chỗ đó ghi "Tháng trước chưa có khoản
chi". Ngược lại, currency chỉ có ở tháng trước vẫn được giữ trong báo cáo (tổng
0, giảm 100%) — ngưng tiêu hẳn một đơn vị tiền là thứ đáng thấy.

Toàn bộ tính ở client trong `utils/report.ts` từ dữ liệu TanStack Query đã có;
tháng trước là một query key riêng nên vẫn được cache và persist như tháng hiện
tại. Không thêm view/RPC phía Postgres.

### 2026-08-19 — B6 (nhập bằng giọng nói)

`hooks/useSpeechRecognition.ts` bọc Web Speech API, `QuickAddSheet` chỉ thêm một
nút mic. Ô nhập chữ không đổi vai: nó vẫn là đường chính, nút mic chỉ đổ chữ vào.

**Ngôn ngữ nhận diện theo locale giao diện**, không để mặc định của trình duyệt:
`vi-VN / en-US / zh-CN / ja-JP`. Đặt sai `lang` thì Web Speech API không báo lỗi
mà trả về chữ vô nghĩa — loại hỏng khó lần ra nhất.

**Mỗi phiên một instance mới.** Dùng lại một đối tượng recognition sau `stop()`
là nguồn lỗi kinh điển của API này trên Chrome, nên `start()` luôn dựng mới và
`onend` vứt đi. `continuous = false`: một lượt bấm là một câu, không để mic mở
mãi mà người dùng không biết lúc nào nó ngừng nghe.

**Chỉ phần `isFinal` mới vào state.** Đoạn tạm (`interim`) chỉ hiện đè lên ô nhập
để thấy máy đang bắt được gì; ô nhập `readOnly` trong lúc nghe vì giá trị hiển
thị đang gồm cả đoạn tạm, gõ chen vào sẽ mất chữ khi đoạn tạm bị thay. Nói lần
thứ hai thì nối tiếp vào câu cũ chứ không ghi đè.

**Không có API thì ẩn hẳn nút**, không hiện rồi báo "không hỗ trợ". Có API nhưng
chạy hỏng (thường gặp trên Safari/iOS) thì trả mã lỗi rút gọn — `denied` /
`no-speech` / `no-mic` / `network` / `generic` — mỗi mã một câu trong dictionary.
`aborted` cố tình im lặng vì đó là do chính mình gọi `abort()` lúc unmount.

### 2026-08-19 — B7 (danh mục + hạn mức, CSV, định kỳ)

**Quản lý danh mục chi tiêu** copy đúng pattern `CategoryManagerModal` của lịch
tuần, thêm ô hạn mức. Đây cũng là đường vào còn thiếu của B5: trước đó
`monthly_budget` chỉ đặt được bằng SQL. Xoá danh mục dùng lại `on delete set
null` của migration `0009` — khoản chi cũ vẫn còn, chỉ thành "chưa phân loại";
câu xác nhận nói rõ điều đó, và mutation invalidate luôn cache chi tiêu vì
`category_id` của các dòng cũ vừa bị DB đổi.

**Xuất CSV sinh ở client**, không cần server. Ba chi tiết dễ bỏ sót đều đã xử lý:
BOM UTF-8 ở đầu file (thiếu là Excel đọc tiếng Việt/Nhật ra ký tự rác), số ghi
dạng máy đọc (`40000`, không dấu phân cách nghìn — định dạng theo locale sẽ bị
bảng tính hiểu sai), và **chặn CSV injection**: ô bắt đầu bằng `=` `+` `-` `@`
được thêm dấu nháy đơn, nếu không một ghi chú "=cmd..." sẽ được Excel thực thi
khi mở file. Tên danh mục xuất ra là tên THÔ trong DB, không dịch — đổi ngôn ngữ
rồi xuất lại mà tên đổi theo thì hai file không ghép được.

**Chi tiêu định kỳ theo đúng pattern chuỗi của `0005`:** mỗi kỳ là một dòng thật
dùng chung `series_id` (migration `0010`). Nhờ vậy sửa lẻ tiền điện tháng 8, xoá
lẻ một kỳ, hay tính báo cáo đều chạy y như khoản chi thường. Cách còn lại — lưu
một "quy tắc lặp" rồi sinh ảo lúc đọc — bắt mọi truy vấn phải biết luật lặp và
không sửa lẻ được một kỳ.

Sửa và xoá chuỗi đều là "kỳ này và các kỳ SAU", không đụng kỳ đã qua: đó là ghi
chép số tiền đã thực trả. `spent_at` cố ý không nằm trong bản vá chuỗi — ghi một
ngày cho cả chuỗi sẽ dồn mọi kỳ về cùng một hôm; đổi ngày chỉ áp cho kỳ đang mở.
Ngày các kỳ do dayjs `.add(i, 'month')` sinh, luôn tính từ mốc gốc nên ngày 31
bị kẹp về 28/2 rồi **quay lại 31** ở tháng 3 thay vì trôi dần.

**Đổi model Groq** không cần code: đã có sẵn env `GROQ_MODEL` từ B0, đổi xong thì
chạy `node scripts/test-parse-expense.mjs` và ghi kết quả vào bảng trong
`docs/test-cases-chi-tieu.md`.

## Checklist tổng

- [x] **B0** env `GROQ_API_KEY` (không có `VITE_`), `_llm.js`, plugin Vite dev, `[functions]` trong `netlify.toml`, `grep dist/` sạch
- [x] **B1** migration `0009`, RLS, seed 7 danh mục + backfill user cũ, cập nhật `database.types.ts`
- [x] **B2** route `/expenses`, nav switcher, i18n 4 ngôn ngữ, CRUD tay, `formatMoney`
- [x] **B3** function `parse-expense` + verify JWT + system prompt + validate zod + bộ 35 test case (34/35 đạt)
- [x] **B4** QuickAddSheet + bảng nháp sửa được + lưu hàng loạt + chống bấm trùng
- [x] **B5** báo cáo tháng, tách theo currency, so với hạn mức
- [x] **B6** voice input (có fallback nhập chữ)
- [x] **B7** quản lý danh mục chi tiêu + hạn mức, xuất CSV, chi tiêu định kỳ (migration `0010`)
- [x] Sau mỗi bước: `npm run typecheck` && `npm run lint` && `npm run build` đều sạch

### Đã kiểm chứng runtime (2026-08-19, sau khi chạy migration)

| Tiêu chí | Kết quả |
|---|---|
| Migration chạy, tài khoản CŨ có 7 danh mục | Đạt — backfill hoạt động (tài khoản này có trước migration) |
| RLS chặn người khác | Đạt — gọi REST bằng anon key trần trả `[]` cho cả 2 bảng, trong khi user đăng nhập thấy đủ dữ liệu của mình |
| Thêm / sửa / xoá tay | Đạt — kèm toast, danh sách cập nhật ngay |
| Định dạng tiền theo từng dòng | Đạt — VND `175.000 ₫`, JPY `1.200 ¥` (vi), `¥1,200` (en), `￥1,200` (ja), `JP¥1,200` (zh) |
| Tổng tháng tách theo currency, không gộp | Đạt — hiện song song `175.000 ₫  1.200 ¥`; xoá hết dòng JPY thì dòng ¥ tự biến mất |
| 4 ngôn ngữ không lọt chữ | Đạt — kể cả tên 7 danh mục seed được dịch qua `translateExpenseCategoryName` |
| Chuyển tháng | Đạt — tháng khác rỗng; form "thêm" điền sẵn ngày 1 của tháng đang xem |
| Câu 3 khoản -> 3 dòng nháp | Đạt — 40000 / 35000 / 100000, "hôm qua" ra đúng 2026-08-18 |
| Sửa danh mục trên bảng nháp rồi lưu | Đạt — dòng "đổ xăng" đổi Di chuyển -> Khác, lưu đúng `category_id` mới |
| `source='ai'` + `raw_text` khớp câu gốc | Đạt — cả 3 dòng; dòng nhập tay là `source='manual'`, `raw_text=null` |
| Chống bấm trùng | Đạt — nút disable và đổi chữ thành "Đang đọc câu của bạn…" trong lúc chờ |
| Lỗi AI hiện thông báo dễ hiểu | Đạt — 429 hiện "AI đang bận, đợi vài giây rồi thử lại nhé" + nút "Nhập tay", không lộ lỗi thô của Groq |

**Một điểm về cache cần biết (không phải lỗi):** `staleTime` là 30s và cache được
persist qua IndexedDB. Sửa dữ liệu bằng đường khác (SQL editor, thiết bị khác) thì
danh sách có thể còn hiện dữ liệu cũ tối đa ~30s sau khi mở lại, cho tới lần
revalidate kế tiếp. Thao tác qua chính UI thì cập nhật ngay vì mutation
`invalidateQueries`.

### Đã kiểm chứng runtime — B5 (2026-08-19)

Dữ liệu test dựng thẳng vào DB rồi đối chiếu với số tự tính tay từ cùng dữ liệu
đó: tháng 8 có 500.000 (Ăn uống) + 250.000 (Di chuyển) + 50.000 (không danh mục)
+ 1.200 ¥, tháng 7 có 350.000 + 150.000. Hạn mức đặt tạm Ăn uống 400.000,
Di chuyển 500.000. Dọn sạch sau khi kiểm chứng (0 khoản chi, hạn mức về `null`).

| Tiêu chí | Kết quả |
|---|---|
| Báo cáo khớp tổng tính tay | Đạt — `800.000 ₫` và `1.200 ¥`, đúng con số tổng hợp trực tiếp từ DB |
| Tỉ lệ % trên tổng | Đạt — 63% / 31% / 6%, cộng lại 100%; khối JPY 100% |
| Tách theo currency, không quy đổi | Đạt — hai khối riêng, thứ tự theo tổng giảm dần |
| Đổi tháng thấy số đổi | Đạt — thg 7 ra `500.000 ₫`, 70% / 30%; thg 9 rỗng hiện "Tháng này chưa có gì để báo cáo" |
| So với tháng trước | Đạt — thg 8 `+60%` (mũi tên lên, đỏ); thg 9 `−88%` (mũi tên xuống, xanh) |
| Tháng trước không có dữ liệu | Đạt — ghi "Tháng trước chưa có khoản chi" thay vì chia cho 0 |
| Currency biến mất ở tháng sau | Đạt — thg 9 vẫn hiện khối `0 ¥` kèm `−100%` |
| Hạn mức: trạng thái vượt | Đạt — Ăn uống 500.000 / 400.000 tô đỏ, thanh đầy (không tràn khung) |
| Hạn mức: trạng thái chưa vượt | Đạt — Di chuyển 250.000 / 500.000 màu accent, thanh nửa |
| Cùng danh mục đổi trạng thái theo tháng | Đạt — Ăn uống vượt ở thg 8, chưa vượt ở thg 7 (350.000 / 400.000) |
| Danh mục không đặt hạn mức | Đạt — không hiện dòng hạn mức nào |
| Khối JPY không hiện hạn mức | Đạt — đúng ý đồ, xem chú thích `DEFAULT_CURRENCY` |
| i18n 4 ngôn ngữ | Đạt — kiểm bằng `ja`: "予算超過 ₫500,000 / ₫400,000", "先月比", tiền vẫn đúng định dạng ja-JP |

### Đã kiểm chứng runtime — B6 (2026-08-19)

Không có micro trong môi trường kiểm thử, nên engine thật được thay bằng một stub
điều khiển được (bắn `interim` / `isFinal` / mã lỗi theo ý muốn) rồi chạy đúng
hook `useSpeechRecognition` đang deploy. Trang harness đã xoá sau khi kiểm.

| Tiêu chí | Kết quả |
|---|---|
| Phát hiện hỗ trợ | Đạt — có API: `supported = true`; xoá cả hai constructor: `supported = false` và `start()` thành no-op, không dựng instance, không set lỗi |
| `lang` đúng theo locale | Đạt — locale `vi` mở phiên với `vi-VN` |
| Đoạn tạm không được lưu | Đạt — `interim` chỉ hiện đè; sau `isFinal` ô nhập giữ đúng chữ đã chốt (đã `trim`) |
| Nói lần hai nối tiếp | Đạt — "bún bò 40k" + "bún bò 40k" ra một chuỗi cách nhau một dấu cách, không ghi đè |
| Không tự gửi lên AI | Đạt — không có request nào phát ra khi nhận `isFinal`; chữ chỉ nằm trong ô nhập |
| Bấm start hai lần | Đạt — chỉ một phiên được mở (log chỉ có một `start`) |
| Mã lỗi | Đạt — `not-allowed` -> `denied`, `no-speech` -> `no-speech`, `clearError()` xoá được |
| `aborted` không báo lỗi | Đạt — `error` vẫn `null` |
| Kết thúc phiên | Đạt — `onend` trả `listening = false`, xoá `interim`, giữ nguyên chữ đã chốt |

**Bổ sung sau khi đăng nhập được (cùng ngày):** nút "Nói" hiện đúng cạnh nút
gửi trong `QuickAddSheet`. Bấm vào trong môi trường bị chặn micro thì UI hiện
"Chưa được phép dùng micro — bật quyền trong cài đặt trình duyệt rồi thử lại"
kèm nút "Nhập tay", ô nhập chữ vẫn dùng bình thường — đúng tiêu chí "thiết bị
không dùng được giọng nói thì UI vẫn chạy qua ô nhập chữ".

**Vẫn chưa kiểm được:** engine nhận diện thật của Chrome Android — cần micro và
thiết bị thật.

### Đã kiểm chứng runtime — B7 (2026-08-19, sau khi chạy migration 0010)

Làm qua UI thật, đối chiếu bằng truy vấn thẳng vào DB. Dọn sạch sau khi kiểm
(0 khoản chi, 7 danh mục seed, không còn hạn mức nào).

**Quản lý danh mục + hạn mức**

| Tiêu chí | Kết quả |
|---|---|
| Sửa danh mục, đặt hạn mức | Đạt — Ăn uống nhận `monthly_budget = 400000`, dòng trong danh sách hiện "Hạn mức 400.000 ₫" |
| Chặn hạn mức 0 | Đạt — nhập `0` báo "Hạn mức phải lớn hơn 0" và không gửi đi (khớp check `monthly_budget > 0` của DB) |
| Thêm danh mục mới | Đạt — emoji ☕, màu `#2fc39a`, hạn mức 150000, `sort_order = 7` (nối cuối, không chen vào bộ seed) |
| Danh mục mới xuất hiện ở nơi khác | Đạt — có ngay trong dropdown của form thêm khoản chi |
| Form sửa hiện tên THÔ | Đạt — "Ăn uống" chứ không phải bản đã dịch, nên lưu lại không khoá danh mục vào một ngôn ngữ |
| Xoá danh mục không mất khoản chi | Đạt — xoá danh mục đang có 1 khoản chi: khoản chi còn nguyên với `category_id = null` |
| Danh sách tự cập nhật sau khi xoá | Đạt — dòng đó đổi ngay sang "❔ Chưa phân loại" (mutation invalidate cache chi tiêu) |
| Câu xác nhận nói đúng hậu quả | Đạt — "Các khoản chi cũ vẫn còn, chỉ chuyển thành chưa phân loại." |
| Nối vào báo cáo (B5) | Đạt — đặt hạn mức 400.000 xong, tab Báo cáo hiện "Vượt hạn mức 500.000 ₫ / 400.000 ₫" đỏ; danh mục không đặt hạn mức không có thanh nào |

**Xuất CSV** — file lấy trực tiếp từ Blob mà nút tạo ra:

| Tiêu chí | Kết quả |
|---|---|
| Tên file + MIME | Đạt — `chi-tieu-2026-08.csv`, `text/csv;charset=utf-8` |
| BOM UTF-8 | Đạt — 3 byte đầu là `EF BB BF` |
| Xuống dòng CRLF | Đạt |
| Nháy kép trong ghi chú | Đạt — `có ""nháy""` |
| Dấu phẩy trong ghi chú | Đạt — nằm trong ngoặc kép, không tách cột |
| Chặn công thức | Đạt — ô mở đầu bằng `=` được thêm `'` (kiểm riêng bằng `buildExpensesCsv` thật với `=cmd|' /C calc'!A0`) |
| Chỉ xuất tháng đang xem | Đạt — 2 kỳ của chuỗi ở tháng 9/10 không lọt vào file tháng 8 |

**Chi tiêu định kỳ**

| Tiêu chí | Kết quả |
|---|---|
| Tạo chuỗi 3 kỳ | Đạt — 3 dòng thật, cùng một `series_id` |
| Kẹp ngày cuối tháng | Đạt — bắt đầu 31/8 ra `2026-08-31`, `2026-09-30`, `2026-10-31`: tháng 9 kẹp về 30 rồi **quay lại 31** ở tháng 10, không trôi dần |
| Nhận ra kỳ định kỳ trong danh sách | Đạt — có biểu tượng lặp cạnh tên |
| Form sửa nhận ra chuỗi | Đạt — hiện dòng nhắc + công tắc "Áp dụng cho kỳ này và các kỳ sau" + nút "Xoá cả chuỗi"; không hỏi "Lặp hàng tháng" nữa |
| Sửa cả chuỗi | Đạt — bật công tắc, đổi 4.000.000 -> 4.500.000: cả 3 kỳ đổi, mỗi kỳ giữ ngày riêng |
| Sửa lẻ một kỳ | Đạt — tắt công tắc, đổi kỳ tháng 9 thành 5.000.000: chỉ tháng 9 đổi, tháng 8 và 10 giữ nguyên |
| Xoá chuỗi từ giữa | Đạt — xoá từ kỳ tháng 9: tháng 9 + 10 mất, **tháng 8 vẫn còn** |
| Không đụng khoản chi khác | Đạt — khoản lẻ (`series_id = null`) không bị ảnh hưởng bởi mọi thao tác chuỗi |

### Việc còn lại cho người dùng

- Thêm `GROQ_API_KEY` vào Netlify **Site settings -> Environment variables**
  (hiện mới chỉ có trong `.env.local`, nên bản deploy sẽ trả `config` error).
