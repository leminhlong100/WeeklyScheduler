# Kế hoạch: Cải tiến UX/UI module Chi tiêu

> ## 🔁 BÀN GIAO CHO AI TIẾP THEO — ĐỌC TRƯỚC
>
> Chủ repo chạy 2 phiên Claude Code luân phiên khi hết token. Phiên nào cũng phải:
>
> 1. Làm trên nhánh **`feat/ux-overhaul`** (`git switch feat/ux-overhaul`). Không làm trên `main`, không push.
> 2. Đọc mục **"Nhật ký tiến độ"** ở cuối file để biết bước nào xong, bước nào đang dở.
> 3. Làm tiếp theo thứ tự trong **Checklist tổng**. Xong mỗi bước: chạy
>    `npm test && npm run typecheck && npm run lint && npm run build`, đánh dấu `[x]`,
>    ghi 1–3 dòng vào Nhật ký, rồi `git commit` (một commit mỗi bước, message tiếng Anh).
> 4. Xong mỗi **đợt** (A/B/C/D): kiểm chứng toàn đợt (test + build + kiểm trên trình duyệt
>    nếu đăng nhập được), ghi kết quả vào Nhật ký trước khi sang đợt sau.
> 5. Không đổi các "Quyết định đã chốt" ở mục 0 nếu chưa hỏi chủ repo.
> 6. Không sửa dữ liệu trong DB. Không tạo migration trong Đợt A–D.

> Tài liệu để giao cho AI phát triển, cùng định dạng với `KE_HOACH_QUAN_LY_CHI_TIEU.md`.
> Làm **tuần tự theo Đợt A → D**. Mỗi bước có "Tiêu chí xong": chưa đạt thì không
> sang bước sau. Sau mỗi bước: `npm run typecheck && npm run lint && npm run build`.
>
> Nguồn: rà soát code ngày 2026-11-13 (3 lượt rà: nhập liệu, bố cục, hiển thị),
> các điểm quan trọng đã được kiểm lại trực tiếp trong code. Đối chiếu thêm với
> Money Lover, Sổ Thu Chi MISA, YNAB, Copilot/Monarch, Zaim/Money Forward.

---

## 0. Bối cảnh và nguyên tắc

**Vấn đề không nằm ở thiếu tính năng.** Module đã có AI nhập câu tiếng Việt, thu/chi,
hạn mức, định kỳ, báo cáo, sổ chia sẻ, ẩn số tiền, CSV. Cái làm app "sao sao" là:

1. **Có lỗi làm sai dữ liệu mà không báo:** gõ `30.000` lưu thành **30 ₫**.
2. **Không có con số chính:** tổng tháng nằm ở khoảng 75% chiều cao màn hình, dưới ô AI,
   tab, hàng icon, bộ lọc và thẻ năm.
3. **Một khái niệm hiện ở nhiều chỗ với số khác nhau:** 4 kiểu "số dư", 2 chỗ thống kê
   tính % theo 2 gốc khác nhau.
4. **Tính năng giấu sau icon không nhãn:** 5 nút icon, trên điện thoại không có hover để đọc `title`.
5. **Chi tiết nhỏ cộng dồn:** số không có dấu chấm hàng nghìn, nút 32px, chữ phụ tương phản
   1.5–2.2:1, "Đánh dấu đã trả" hiện trên khoản thu, đang tải thì báo "chưa có khoản chi".

**Nguyên tắc cho mọi thay đổi:**

| Nguyên tắc | Cụ thể |
|---|---|
| Ghi một khoản ≤ 5 giây | Tối đa 4 lần chạm cho nhập tay, mặc định thông minh |
| Mở app là thấy câu trả lời | Một con số chính: "Còn được tiêu" hoặc "Số dư" tháng này |
| Một khái niệm, một chỗ, một cách tính | Không có hai màn hình cho ra hai số khác nhau |
| Không bao giờ nói sai | Đang tải ≠ trống; lỗi mạng ≠ trống; dữ liệu nhập sai phải bị chặn |
| Hoàn tác thay vì hỏi lại | Xoá / đánh dấu đã trả: làm ngay, có "Hoàn tác" 5 giây |
| Mọi nút có chữ hoặc nằm ở chỗ ai cũng hiểu | Không còn hàng icon trơ trọi |

**Quyết định đã chốt (đề xuất, bạn duyệt trước khi làm):**

| Quyết định | Lý do |
|---|---|
| **Đợt A không đổi bố cục** | Sửa lỗi sai dữ liệu trước, độc lập với việc thiết kế lại |
| Ô tiền giữ **chuỗi số thô** (`"30000"`) trong form state, chỉ phần hiển thị có dấu chấm | Schema, `parseAmount`, AI draft không phải đổi kiểu dữ liệu |
| % danh mục **chia cho tổng chi** (không chia cho thu nhập) | Tổng các % = 100%, khớp biểu đồ tròn. Tỉ lệ chi/thu hiện riêng một dòng "Đã tiêu X% thu nhập" |
| Bỏ `ExpenseStatsDialog`, gộp biểu đồ tròn vào tab Báo cáo | Hết cảnh hai chỗ hai số |
| Tháng đang xem đưa vào URL (`/expenses?m=2026-11`) | Đổi tab không mất tháng, reload giữ tháng, nút Back hoạt động |
| "Còn được tiêu" **không cần migration** ở bước đầu | Tính từ tổng `monthly_budget` các danh mục chi; chưa đặt hạn mức thì hiện Số dư (thu − chi) |
| Thanh dưới là **riêng của module Chi tiêu** | Lịch tuần đã có `MobileActionBar`; dùng chung sẽ ra hai thanh |
| Thêm **Vitest** chỉ cho hàm thuần (tiền, % , lọc) | Hiện repo chưa có test runner; các hàm này sai là sai tiền |

---

## Đợt A — Sửa lỗi làm sai dữ liệu hoặc nói sai (không đổi bố cục)

### A0. Vitest cho hàm thuần

- `npm i -D vitest`, thêm script `"test": "vitest run"`.
- Chỉ test file trong `src/features/expenses/utils/` và `src/lib/utils/formatMoney.ts`.
  Không dựng test UI.
- Chuyển 25 case logic tiền đang chạy bằng script tạm (xem cuối `KE_HOACH_QUAN_LY_CHI_TIEU.md`)
  thành test thật.

**Tiêu chí xong:** `npm test` chạy, 25 case cũ đạt.

### A1. `<MoneyInput>` dùng chung ⭐ (ưu tiên cao nhất)

**Lỗi hiện tại (đã kiểm):** `ExpenseEditForm.tsx:275-284` dùng `type="number"` và
`expenseSchema.ts:26` dùng `Number(v)`. Gõ `30.000` → `30`, vẫn qua validate `> 0`,
lưu thành 30 ₫. Dán `30k` / `30.000đ` → chuỗi rỗng → lỗi "Vui lòng nhập thông tin này"
dù đã gõ. Cùng lỗi ở `ParsedDraftList.tsx:188-198` và ô hạn mức
`ExpenseCategoryFormFields.tsx:114-123`. Placeholder `vi.ts:310` ghi `40000`.

**Tạo:**
- `src/lib/utils/parseMoneyInput.ts`: `parseMoneyInput(raw, currency, locale) → { digits: string } | { error }`
- `src/components/form/MoneyInput.tsx`

**Quy tắc phân tích `raw`:**

| Gõ | VND/JPY ra | Ghi chú |
|---|---|---|
| `30000`, `30.000`, `30 000`, `30,000` | `30000` | Bỏ mọi dấu phân cách nghìn |
| `30k`, `30 nghìn`, `30 ngàn` | `30000` | Hậu tố ×1.000 |
| `1,5tr`, `1.5tr`, `1,5 triệu` | `1500000` | Có hậu tố thì `,` hoặc `.` là dấu thập phân |
| `30000.5` | lỗi `expenseAmountWhole` | VND/JPY phải là số nguyên |
| `12.50` (USD) | `12.50` | USD cho tối đa 2 số lẻ, dấu thập phân theo locale |
| `-5`, `abc` | không nhận ký tự | Chặn ngay khi gõ |

**Hành vi `MoneyInput`:**
- `type="text"`, `inputMode="numeric"` (USD: `decimal`), `autoComplete="off"`, `enterKeyHint="done"`.
- Hiển thị có dấu nhóm theo locale khi đang gõ (`vi`: `30.000`, `en`: `30,000`) bằng
  `formatAmount` sẵn có ở `formatMoney.ts:34`.
- **Giữ vị trí con trỏ:** đếm số chữ số trước con trỏ → format lại → đặt con trỏ sau đúng
  ngần ấy chữ số. Không làm thì con trỏ nhảy về cuối mỗi lần gõ.
- Hậu tố `k`/`tr` được đổi thành số đầy đủ khi blur.
- Ký hiệu tiền (`₫`, `¥`, `$`) hiện bên phải trong ô, không gõ được.
- Cỡ chữ ≥ 16px trên mobile (tránh iOS tự zoom), số to và đậm (`text-2xl` trong form tay).
- Hàng chip nhanh bên dưới (ẩn trong bảng nháp vì chật): `000`, `+10k`, `+50k`, `+100k`
  (JPY: `00`, `+100`, `+1.000`, `+5.000`). Chip cao ≥ 36px.
- Ghi vào form state chuỗi số thô (`"30000"`), không phải chuỗi có dấu.

**Schema** (`expenseSchema.ts`, `expenseCategorySchema.ts`): refine theo currency (VND/JPY số
nguyên), `max` = `999_999_999_999.99` (khớp `numeric(14,2)`), mọi thông điệp là key i18n.

**Thay ở:** `ExpenseEditForm`, `ParsedDraftList` (+ `draft.ts:40` vẫn giữ chuỗi số thô),
`ExpenseCategoryFormFields` (ô hạn mức). Sửa placeholder thành `40.000` ở 4 ngôn ngữ
theo định dạng của từng locale.

**Tiêu chí xong:**
- Test `parseMoneyInput` phủ hết bảng trên, đạt.
- Trên trình duyệt: gõ `30000` thấy `30.000`; gõ `30.000` lưu đúng **30.000 ₫** (kiểm trong DB);
  dán `30k` lưu 30.000; `1,5tr` lưu 1.500.000; gõ chữ số ở giữa không làm con trỏ nhảy.
- Đổi locale sang `en` thấy `30,000`.
- Bảng nháp AI hiện `40.000` chứ không phải `40000`.

### A2. Trạng thái đang tải / lỗi / offline

**Lỗi hiện tại (đã kiểm):** `ExpensesPage.tsx:122` và `MonthlyReport.tsx:210` dùng
`data: expenses = []`. Đang tải hoặc mất mạng ở tháng chưa có cache → màn hình nói
"Tháng này chưa có khoản chi nào". Chuyển tháng thì trạng thái trống loé lên.

**Làm:**
- `useExpensesForMonth`: thêm `placeholderData: keepPreviousData` (chuyển tháng giữ dữ liệu cũ, mờ đi).
- Component `ExpenseListSkeleton` (3 hàng) khi `isPending` và chưa có dữ liệu.
- `isError` → khối "Không tải được dữ liệu. Kiểm tra mạng rồi thử lại." + nút **Thử lại** (`refetch`).
- Đang offline mà có cache → dải nhỏ "Đang ngoại tuyến · dữ liệu lúc HH:mm" (dùng `dataUpdatedAt`).
- Áp cho cả `MonthlyReport`.

**Tiêu chí xong:** DevTools → Network Slow 3G: thấy skeleton, không thấy chữ "chưa có".
Offline + tháng chưa xem: thấy khối lỗi và nút Thử lại. Chuyển tháng không còn nháy trống.

### A3. Chống gửi trùng

**Hiện tại:** `ExpenseEditForm.tsx:461` chỉ disable theo `mutation.isPending`, cờ này bật
**sau** khi zodResolver (async) chạy xong → chạm đúp nhanh có thể tạo 2 khoản. Cùng mẫu ở
`ExpenseCategoryEditForm.tsx:84,98`.

**Làm:** disable khi `formState.isSubmitting || mutation.isPending`, disable cả nút Huỷ khi đang lưu.

**Tiêu chí xong:** bấm đúp Lưu thật nhanh (hoặc gọi `requestSubmit()` hai lần liên tiếp trong console) chỉ tạo 1 dòng trong DB.

### A4. Ẩn số tiền: bịt lỗ hở và sửa nút "không làm gì"

**Hiện tại (đã kiểm):**
- `AmountVisibilityContext.tsx:41,70-76`: `hidden` mặc định `true` nhưng `hiddenScopes` rỗng →
  nút con mắt bấm không thấy gì thay đổi, tưởng hỏng.
- Khoản **chưa phân loại** (`category_id = null`) không bao giờ bị che (`ExpenseRow.tsx:93`).
- `ExpenseStatsDialog` che theo scope `month`, `MonthlyReport` thì không → cùng danh mục, chỗ che chỗ lộ.
- % so với thu nhập không bị che → vẫn suy ra được tỉ lệ.
- Ô tìm kiếm khớp cả số tiền khi đang che.

**Làm:**
- Lần đầu dùng (chưa có scope nào lưu) thì mặc định che **tất cả** (`month`, `year`, `day`, mọi danh mục, `cat:none`).
  Hộp "Chọn mục ẩn" vẫn giữ để bỏ bớt.
- Thêm khoá `cat:none`. Một hàm `isMasked` duy nhất dùng ở mọi chỗ, che cả %.
- Khi đang che: tìm kiếm bỏ qua phần khớp số tiền.

**Tiêu chí xong:** tài khoản mới bấm con mắt → mọi số tiền đổi thành `•••`, kể cả khoản
chưa phân loại và các %. Bấm lại → hiện hết.

### A5. Một gốc tính %

**Hiện tại (đã kiểm):** `ExpenseStatsDialog.tsx:124,193` dùng `ofIncome ?? share` (chia cho thu),
`MonthlyReport.tsx:130` dùng `share` (chia cho tổng chi). `percent()` ở dialog ghép chuỗi ra `0.4%`
thay vì `0,4%`.

**Làm:** tạm thời (trước khi Đợt C xoá dialog) cho cả hai dùng `share`. Viết `formatPercent(value, locale)`
bằng `Intl.NumberFormat(..., { style: 'percent', maximumFractionDigits: 1 })`, dùng ở mọi chỗ.
Thêm một dòng riêng "Đã tiêu X% thu nhập" ở đầu báo cáo khi tháng có thu.

**Tiêu chí xong:** cùng danh mục, cùng tháng: hai màn hình hiện cùng một %. Locale `vi` ra `0,4%`.

---

## Đợt B — Nền tảng hiển thị (vẫn chưa đổi bố cục)

### B1. Định dạng tiền có dấu, một helper

**Hiện tại:** hàng chi không dấu (`ExpenseRow.tsx:94`), tổng ngày/tổng tháng/báo cáo dùng `−`
(U+2212), số dư âm qua `Intl` ra `-` thường.

**Làm:** `formatSignedMoney(amount, currency, locale, sign: 'expense' | 'income' | 'auto')` trong
`formatMoney.ts`. Chi: `−40.000 ₫`, thu: `+40.000 ₫`, số dư âm: `−` (U+2212). Thay ở mọi chỗ,
thêm test.

**Tiêu chí xong:** `grep` không còn chỗ nào ghép tay `'+'`/`'−'` với `formatMoney`. Hàng và tổng ngày
cùng kiểu dấu.

### B2. Token màu theo theme, đạt tương phản 4.5:1

**Hiện tại (đã kiểm):** `INCOME_COLOR = '#2fc39a'` viết cứng ở **7 file** (khoảng 2.2:1 trên nền trắng).
`theme.muted` của theme sáng chỉ 1.5–2.2:1 (Chanh vàng `#d9c98a` trên `#fdf6d9` ≈ 1.5:1), mà đây là
màu tiêu đề ngày, tên danh mục, %, hạn mức. Badge "Dự kiến" `#b07300` + opacity 0.85 ≈ 3.5:1.

**Làm:**
- Thêm vào type theme và `themes.ts`: `income`, `expenseNegative`, `warning`, `mutedText`.
  Theme sáng dùng tông đậm (ví dụ thu ≈ `#0f8a66`), theme tối giữ tông sáng.
- `deriveTheme.ts` / theme tự tạo: tính `mutedText` bằng cách đẩy độ sáng tới khi đạt 4.5:1 với `chip`/`bg`
  (đã có `ContrastBadge` và `lib/utils/color.ts` để tính tương phản).
- Xoá 7 hằng `INCOME_COLOR` và `OVER_BUDGET_COLOR` viết cứng.
- Bỏ `opacity` của cả hàng dự kiến; viền gạch nối đã đủ phân biệt.

**Tiêu chí xong:** với mọi theme có sẵn, chữ phụ và màu thu đạt ≥ 4.5:1 trên nền thẻ (viết một test
duyệt qua `themes.ts` và kiểm bằng hàm tương phản).

### B3. Thuật ngữ và i18n

**Bảng thuật ngữ (áp cho `vi.ts`, các ngôn ngữ khác dịch tương ứng):**

| Khái niệm | Dùng | Tránh |
|---|---|---|
| Bản ghi chung | **giao dịch** | "khoản chi" khi gồm cả thu |
| Kind | **Chi / Thu**, khoản chi / khoản thu | |
| Thu − chi | **Số dư** (cả tháng lẫn sổ, kèm phạm vi: "Số dư tháng 11", "Số dư từ trước tới nay") | Còn lại, Số dư quỹ |
| Planned | **Dự kiến**; đã qua ngày: **Quá hạn** | kỳ dự kiến |
| Mark paid | **Đã trả** (chi) / **Đã nhận** (thu) | "Đánh dấu đã trả" trên khoản thu |
| Series | **Lặp hằng tháng**; "lần này và các lần sau" | kỳ, chuỗi |
| monthly_budget | **Hạn mức tháng**, Vượt hạn mức | ngân sách |
| Currency | **Tiền tệ** | Đơn vị |
| Ngày | **Ngày** | Ngày chi |
| Xoá | **Xoá** (một kiểu) | trộn Xóa/Xoá, Sức khỏe/Sức khoẻ |

**Làm thêm:**
- Tiêu đề form, nhãn, toast đổi theo `kind`: "Thêm khoản thu", "Đã thêm khoản thu" (`vi.ts:307-324`).
- `max(200)` / `max(40)` trong schema dùng key i18n (hiện hiện nguyên văn tiếng Anh của zod), thêm `maxLength` cho input.
- "Quản lý danh mục chi tiêu" → "Danh mục" (trong đó có cả danh mục thu).
- CSV: giữ cột mã thô, thêm cột nhãn đã dịch; tên file theo locale.

**Tiêu chí xong:** chọn Thu trong form → không còn chữ "chi" nào trên form và toast. `grep "Xóa"` trong `vi.ts` rỗng.

### B4. Vùng chạm và cỡ chữ trên mobile

**Làm:**
- Thêm biến thể `size="touch"` (h-11) cho `Button`; dùng cho Lưu/Huỷ ở form tiền, form danh mục, bảng nháp.
- Bảng nháp: ô và nút xoá `h-11` trên mobile.
- Nút Chi/Thu: `role="radiogroup"` + `role="radio"`, cao ≥ 44px (hiện `role="tab"`, cao 26–32px).
- Lưới emoji danh mục: 6 cột trên mobile (hiện 8 cột ≈ 36px/ô).
- Ô AI `QuickAddSheet.tsx:156`: `text-base` trên mobile (hiện 13.5px → iOS zoom).
- Tab lọc `ExpenseFilters.tsx:104`: `min-h-11`; sửa `aria-label` của tablist từ "Tất cả" thành "Loại".
- `FormField`: nối lỗi với ô bằng `aria-invalid` + `aria-describedby`.

**Tiêu chí xong:** ở viewport 375px, chạy đoạn JS đếm mọi `button, [role=radio], input` trong module
có chiều cao < 44px → chỉ còn những chỗ có lý do (ghi lại lý do).

---

## Đợt C — Bố cục mới

### C1. Nâng state lên URL

`month` và tab hiện nằm cục bộ trong `ExpensesPageContent` (`ExpensesPage.tsx:101-114`).
Chuyển sang `useSearchParams`: `?m=2026-11&tab=overview|transactions|report|more`.
Logic reset bộ lọc khi đổi sổ và `DRAFT_STORAGE_KEY` của bản nháp AI **giữ nguyên**.

**Tiêu chí xong:** đổi tab không mất tháng; reload giữ tháng và tab; Back quay lại tab trước.

### C2. Thanh điều hướng dưới (mobile) và sidebar (desktop)

**Mobile (< md):** component `ExpenseBottomNav` đặt vào khe `AppShell.bottomBar` sẵn có (`AppShell.tsx:12,66`):

```
[ Tổng quan ] [ Giao dịch ] [  ＋  ] [ Báo cáo ] [ Thêm ]
```

- Icon + chữ, cao ≥ 56px + safe-area. Nút ＋ tròn, nổi ở giữa.
- `md:hidden` (thống nhất với `useIsMobile`, tránh khoảng 640–767px không có gì).
- `canEdit = false` (sổ chỉ xem): ẩn ＋, giữ chỗ trống để bố cục không nhảy khi quyền đang tải.
- z-index: dưới drawer (`z-[65]/[70]`), trên nội dung (`z-[50]`).

**Desktop (≥ md):** sidebar có ModuleNav, danh sách sổ dạng dọc, 4 mục điều hướng. Header có chọn tháng
và nút **"+ Thêm giao dịch"** có chữ. Vẫn giữ chip sổ trong header (sidebar có thể đang đóng trên iPad).

**Tiêu chí xong:** mobile chuyển 4 tab bằng 1 chạm; sổ chỉ xem không có ＋; desktop không có thanh dưới.

### C3. Tab Tổng quan (mặc định)

Từ trên xuống:

1. **Header gọn:** `‹ Tháng 11/2026 ›`, bấm vào nhãn tháng mở `MonthPicker` (lưới 12 tháng + đổi năm).
   Khi không ở tháng hiện tại: chip **"Về tháng này"**. (Hiện nút "Hôm nay" bị ẩn trên mobile: `ExpensesHeader.tsx:83`.)
   Chip sổ dạng dropdown (`LedgerSwitcher`, dùng lại logic `LedgerBar`).
2. **`SpendableCard`** (thẻ chính):
   - Có hạn mức: **"Còn được tiêu"** = Σ `monthly_budget` danh mục chi − chi `paid` trong các danh mục đó (VND).
     Dòng phụ: "≈ X/ngày · còn N ngày" (chỉ ở tháng hiện tại), thanh tiến độ, dòng "Dự kiến: −Y" cho khoản `planned`.
   - Chưa có hạn mức: **"Số dư tháng 11"** (thu − chi) + link "Đặt hạn mức để biết còn được tiêu bao nhiêu".
   - Sổ chia sẻ: dùng số dư từ trước tới nay (`LedgerBalanceCard`), ghi rõ "từ trước tới nay".
   - Một nút con mắt duy nhất ở đây (bỏ nút trùng ở thanh công cụ và `ExpenseSummaryCard.tsx:136`).
   - Dòng nhỏ: Thu · Chi tháng này.
   - Nhiều tiền tệ: hiện VND làm số chính, các tiền tệ khác thành dòng nhỏ bên dưới.
3. **`BudgetProgressList`:** 3–5 danh mục có hạn mức, sắp theo % đã dùng giảm dần, ≥ 80% tô vàng,
   vượt tô đỏ. Danh mục có hạn mức nhưng chưa tiêu vẫn hiện `0 / 2.000.000` (đang thiếu, đã ghi ở tài liệu cũ).
   Link "Tất cả" → tab Báo cáo. Tách từ `MonthlyReport.tsx:155-182`.
4. **Sắp tới:** khoản `planned` trong 7 ngày tới và khoản quá hạn, có nút ✓ Đã trả.
5. **Gần đây:** 5 giao dịch mới nhất (dùng lại `ExpenseRow`), link "Xem tất cả".
6. **`ExpenseEmptyState`** cho người mới: 3 bước "Ghi giao dịch đầu tiên · Đặt hạn mức · Ghi thu nhập",
   kèm ví dụ "Thử gõ: ăn sáng 30k".

**Tiêu chí xong:** mở `/expenses` trên 375×812: thẻ chính nằm trong 1/3 trên màn hình. Số trên thẻ chính
khớp với số tính tay từ DB. Tài khoản mới thấy màn hướng dẫn, không thấy 3 thông báo "chưa có" rời rạc.

### C4. Tab Giao dịch

- `ExpenseFilters` + danh sách theo ngày (giữ `ExpenseList`, **bỏ thẻ năm và thẻ tổng tháng** ở đây).
- Đang lọc: thanh "12 giao dịch · −1.250.000 ₫" + nút "Bỏ lọc" (thay cho thẻ tổng tháng tính trên tập lọc,
  vốn dễ nhầm với số dư tháng).
- Tiêu đề ngày: **Hôm nay**, **Hôm qua**, còn lại "Thứ Năm, 13/11"; 13px, màu `mutedText`.
  Ngày chỉ có khoản dự kiến hiện "Dự kiến −X" thay cho "(có kỳ dự kiến)".
- Khoản `planned` ở tương lai gom vào nhóm **"Sắp tới"** thu gọn ở cuối (hiện tiền nhà ngày 30 nằm trên cả hôm nay).
  Badge **"Quá hạn"** khi `planned && spent_at < hôm nay`.
- Tìm kiếm: chuỗi số bỏ `.`/`,`/khoảng trắng, hiểu `k`/`tr` (dùng `parseMoneyInput`), tìm cả tên danh mục đã dịch.
- Nút **"Xuất CSV"** có chữ ở cuối danh sách (xuất đúng tập đang lọc, như hiện tại).

**Tiêu chí xong:** gõ `40.000` hoặc `40k` tìm ra khoản 40.000. Gõ "ăn" ra các khoản thuộc Ăn uống dù ghi chú không có chữ "ăn".

### C5. Tab Báo cáo

- Đầu trang: biểu đồ tròn (chuyển `Donut` từ `ExpenseStatsDialog`), `aria-label` mô tả.
- `MonthlyReport` như hiện có, % chia cho tổng chi (A5), dòng "Đã tiêu X% thu nhập".
- Thêm mục **"Năm nay"** (thẻ năm chuyển từ `ExpenseList`).
- **Xoá `ExpenseStatsDialog.tsx`** và nút mở nó.

**Tiêu chí xong:** không còn file `ExpenseStatsDialog.tsx`; báo cáo khớp tổng tính tay như kiểm chứng B5 cũ.

### C6. Tab Thêm

Danh sách có icon + chữ, mỗi dòng ≥ 52px:
- Sổ: chuyển sổ, tạo sổ, cài đặt & chia sẻ (`LedgerSettingsDialog`)
- Danh mục & hạn mức (`ExpenseCategoryManagerModal`)
- Ẩn số tiền (`AmountVisibilityDialog`)
- Xuất CSV tháng này
- Ngôn ngữ, Theme
- Chuyển sang Lịch tuần

Sổ chỉ xem: ẩn "Danh mục & hạn mức" và "Tạo sổ".

**Xoá:** hàng 5 icon (`ExpensesPage.tsx:222-275`), `ExpenseTabs`, nút ＋ ở header trên mobile.

**Tiêu chí xong:** mọi tính năng cũ đều tìm được trong tối đa 2 chạm, mỗi nút có chữ.

---

## Đợt D — Ghi nhanh và thao tác

### D1. Bảng "Thêm giao dịch" (mở từ nút ＋)

Bottom sheet, 2 chế độ chuyển bằng segmented control: **Gõ/nói (AI)** | **Nhập tay**.
Có bản nháp AI trong sessionStorage thì mở thẳng vào bảng nháp.

**Nhập tay, theo thứ tự trên màn hình:**
1. Chi / Thu (radio lớn, nhớ lựa chọn trước).
2. `MoneyInput` cỡ lớn, **tự focus** khi mở (`setFocus('amount')`) → bàn phím số bật ngay.
3. **Lưới danh mục** 4 cột emoji + tên ngắn, ô ≥ 56px, danh mục dùng nhiều trong 30 ngày qua lên đầu,
   hiện 8 ô + "Xem thêm". Thay dropdown hiện tại (mục chỉ cao ~28px).
4. Ngày: chip **Hôm nay / Hôm qua / Chọn ngày…**.
5. Ghi chú (không bắt buộc), tiền tệ dạng segmented `₫ ¥ $`, Lặp hằng tháng (thu gọn trong "Tuỳ chọn khác").
6. Nút **Lưu** to ở đáy (vùng ngón cái) + nút phụ **"Lưu & thêm tiếp"** (giữ ngày, danh mục; xoá số tiền và ghi chú).

**Nhớ lựa chọn** (localStorage, theo từng sổ): tiền tệ, Chi/Thu, danh mục gần nhất. AI cũng dùng tiền tệ này
làm mặc định thay cho `DEFAULT_CURRENCY` cố định (`QuickAddSheet.tsx:99`).

**iOS bàn phím che nút Lưu:** dùng `visualViewport` để đặt chiều cao sheet (iOS bỏ qua
`interactive-widget=resizes-content`).

**Tiêu chí xong:** từ trang Tổng quan, ghi "Cà phê 35.000, Ăn uống, hôm nay" bằng **4 chạm**
(＋ → gõ số → chọn ☕/🍜 → Lưu). Mở lại form thấy đúng tiền tệ và loại vừa dùng.

### D2. Hoàn tác thay cho hỏi lại

- **Xoá giao dịch:** bỏ `window.confirm` (`ExpensesPage.tsx:148`). Xoá lạc quan khỏi cache ngay,
  toast "Đã xoá · Hoàn tác" 5 giây, hết 5 giây mới gọi API (hoặc gọi ngay và tạo lại khi hoàn tác; chọn
  cách "đợi rồi gọi" để không đổi `id`).
- **Đã trả / Đã nhận:** cập nhật lạc quan + toast có Hoàn tác (hiện cập nhật ngay, không hỏi, không hoàn tác: `ExpensesPage.tsx:156-165`).
- **Thêm mới:** toast "Đã thêm · Hoàn tác".
- Các xác nhận **không hoàn tác được** (xoá sổ, xoá chuỗi lặp, xoá danh mục, gỡ thành viên, đổi mã mời —
  7 chỗ `window.confirm`) chuyển sang `ConfirmDialog` theo theme, nút nguy hiểm màu đỏ, nói rõ hậu quả.

**Tiêu chí xong:** không còn `window.confirm` trong `src/`. Xoá rồi bấm Hoàn tác → dòng quay lại, DB không đổi.

### D3. Hàng giao dịch

- **Bấm cả hàng** để mở form sửa; nút Xoá nằm trong form. Bỏ 3 nút icon 32px trên hàng
  (`ExpenseRow.tsx:108,119,130`), ghi chú không còn bị cắt.
- Chỉ giữ nút ✓ (44px) trên hàng dự kiến, đặt trong một ô cố định để cột tiền luôn thẳng hàng.
- Ghi chú trống: đưa tên danh mục lên làm tiêu đề, bỏ "(không ghi chú)".

**Tiêu chí xong:** ở 375px, cột số tiền của mọi hàng thẳng một đường; ghi chú 30 ký tự không bị cắt.

### D4. Bảng nháp AI

- Dòng tổng: "3 giao dịch · −115.000 ₫".
- Hiện câu gốc thu gọn ở đầu để đối chiếu.
- Dòng không hợp lệ: viền đỏ + câu "Dòng 2: số tiền chưa hợp lệ"; nút "Lưu tất cả" vẫn bấm được và cuộn tới dòng lỗi
  (hiện bị khoá mà không nói lý do: `ParsedDraftList.tsx:72-73,289`).
- "Bỏ bản nháp" → câu gốc quay lại ô nhập để sửa (hiện mất: `QuickAddSheet.tsx:106`).
- AI lỗi → "Nhập tay" điền sẵn số tiền đầu tiên tìm được trong câu.
- Spinner + `aria-busy` khi chờ AI; tương phản dòng "AI không chắc" ≥ 4.5:1.

**Tiêu chí xong:** nhập câu 3 khoản, sửa 1 dòng thành số tiền rỗng → thấy dòng đỏ và lời nhắc; bỏ nháp → câu cũ còn trong ô.

---

## Đợt E — Tính năng mới (sau khi A–D ổn định, lập kế hoạch riêng)

| Việc | Ghi chú |
|---|---|
| Hạn mức tổng tháng | Migration thêm cột (ví dụ `profiles.monthly_budget` hoặc theo sổ). `SpendableCard` dùng nếu có |
| Cảnh báo 80% hạn mức | Toast khi lưu khoản làm danh mục vượt 80% / 100% |
| Khoản hay dùng | Nút tắt từ 5 cặp (ghi chú, số tiền, danh mục) lặp nhiều nhất |
| Lưu ngay khi AI chắc chắn và chỉ 1 khoản | Bỏ bước nháp, có Hoàn tác |
| PWA shortcut "Thêm giao dịch" | `shortcuts` trong manifest (`vite.config.ts`), mở thẳng `/expenses?add=1` |
| Chụp hoá đơn bằng AI | Cần model đọc ảnh, kiểm tra model khả dụng trên Groq trước |
| Ví (tuỳ chọn), sổ nợ, mục tiêu tiết kiệm | Theo hướng đã bàn: không bắt buộc thiết lập |
| Giới hạn lượt gọi AI theo user | Còn mở từ tài liệu cũ |

---

## Rủi ro và cách xử lý

| Rủi ro | Xử lý |
|---|---|
| `MoneyInput` làm con trỏ nhảy, đặc biệt trên Android IME | Giữ con trỏ theo số chữ số đứng trước; thử trên Chrome Android và Safari iOS thật |
| Dữ liệu cũ đã bị lưu sai (30 thay vì 30.000) | Sau A1, chạy truy vấn tìm khoản VND `amount < 1000` để bạn tự xem và sửa; **không tự sửa** |
| Đổi gốc % làm người dùng thấy số khác quen | Ghi rõ "trên tổng chi" ngay cạnh con số |
| Sổ chỉ xem (`canEdit=false`) bị lộ nút ghi | Kiểm từng tab bằng tài khoản người xem |
| Người xem sổ chia sẻ thấy "còn được tiêu" theo hạn mức của chủ sổ | Sổ chia sẻ dùng số dư từ trước tới nay, không dùng "còn được tiêu" |
| Hạn mức chỉ có nghĩa với VND | Thẻ chính lấy VND; tiền tệ khác chỉ hiện thu/chi |
| Thanh dưới đè lên dialog/drawer | Giữ thứ tự z-index hiện có, kiểm khi mở drawer và bottom sheet |
| Mất bản nháp AI khi chuyển sang bottom sheet | Giữ nguyên `DRAFT_STORAGE_KEY` và cơ chế sessionStorage |
| Lịch tuần bị ảnh hưởng | `ExpenseBottomNav` chỉ render trong `ExpensesPage`; kiểm lại trang `/` |

---

## Checklist tổng

- [x] **A0** Vitest + 25 case cũ thành test
- [x] **A1** `MoneyInput` + `parseMoneyInput`, thay ở 3 form, placeholder 4 ngôn ngữ
- [x] **A2** skeleton / lỗi / offline, `keepPreviousData`
- [x] **A3** chống gửi trùng `isSubmitting`
- [x] **A4** ẩn số tiền: mặc định che hết, `cat:none`, che %
- [x] **A5** một gốc %, `formatPercent`
- [x] **B1** `formatSignedMoney`
- [x] **B2** token màu theo theme, ≥ 4.5:1, xoá 7 màu viết cứng
- [x] **B3** thuật ngữ, nhãn theo kind, lỗi zod i18n
- [x] **B4** vùng chạm 44px, ô AI 16px, ARIA
- [x] **C1** tháng + tab vào URL
- [x] **C2** `ExpenseBottomNav` + sidebar desktop
- [x] **C3** Tổng quan: `SpendableCard`, `BudgetProgressList`, Sắp tới, Gần đây, trạng thái trống
- [x] **C4** Giao dịch: thanh kết quả lọc, nhãn ngày, nhóm Sắp tới, Quá hạn, tìm số tiền
- [x] **C5** Báo cáo gộp biểu đồ tròn, xoá `ExpenseStatsDialog`
- [x] **C6** tab Thêm, xoá hàng 5 icon
- [x] **D1** bảng Thêm giao dịch: tự focus, lưới danh mục, chip ngày, nhớ lựa chọn, Lưu & thêm tiếp
- [x] **D2** hoàn tác cho xoá / đã trả / thêm; `ConfirmDialog` thay 7 `window.confirm`
- [ ] **D3** bấm cả hàng để sửa, cột tiền thẳng hàng
- [ ] **D4** bảng nháp AI: tổng, câu gốc, lỗi theo dòng, giữ câu khi bỏ nháp
- [ ] Sau mỗi bước: `npm test && npm run typecheck && npm run lint && npm run build`
- [ ] Sau mỗi đợt: kiểm trên điện thoại thật (375px), cả theme sáng và tối, cả 4 ngôn ngữ

---

## Nhật ký tiến độ

> Ghi mới nhất ở dưới cùng. Mỗi dòng: ngày — bước — kết quả / ghi chú cho phiên sau.

- 2026-11-13 — Tạo nhánh `feat/ux-overhaul`, bắt đầu Đợt A.
- 2026-11-13 — A0+A1+A3 xong (commit 48d9388 và trước đó). Vitest 4 (vitest.config.ts riêng), 51 test. MoneyInput ở src/components/form, parser ở src/lib/utils/parseMoneyInput.ts. Đã kiểm trên trang thử: 30000→30.000, '30.000'→30000, '1,5tr'→1.500.000, chèn số giữa giữ con trỏ, chip +50k. CHƯA kiểm được trang thật vì không đăng nhập được (Google OAuth). Trang thử cục bộ: harness.html + harness/ (bị .git/info/exclude, không commit).
- 2026-11-13 — A2 xong: QueryStatus (skeleton / lỗi + Thử lại / dải ngoại tuyến), placeholder giữ tháng cũ nhưng CHỈ trong cùng sổ (keepWithinLedger). Kiểm trên trang thử.
- 2026-11-13 — A4 xong, KHÁC kế hoạch một chút: không mặc định che hết (vì cờ ẩn reset mỗi lần mở app → người mới sẽ thấy toàn ••• mỗi lần mở). Thay vào đó: chưa chọn mục nào thì nút con mắt = che tất cả. Thêm khoá cat:none, che % trong báo cáo, tìm kiếm bỏ qua số tiền khi đang che.
- 2026-11-13 — A5 xong: formatPercent (Intl, vi ra 0,4%), hộp Thống kê dùng share như Báo cáo, thêm dòng 'Đã tiêu X% thu nhập' (che theo scope month).
- 2026-11-13 — **KIỂM CHỨNG ĐỢT A: ĐẠT** — 53 test, typecheck/lint (0 lỗi)/build sạch; MoneyInput và QueryStatus kiểm trên trang thử. Chưa kiểm trang thật (cần chủ repo đăng nhập). Việc cho chủ repo: sau khi deploy, tìm khoản VND amount < 1000 trong DB để xem có khoản nào bị lưu sai từ lỗi cũ.
- 2026-11-13 — B1 xong: formatSignedMoney (chi luôn −, thu +, số dư âm U+2212). Lưu ý: commit này cũng chạy prettier trên src/features/expenses/components (chỉ đổi định dạng).
- 2026-11-13 — B2 xong: DerivedTheme có thêm mutedText/income/warning/warningBg, danger cũng được chỉnh đạt 4.5:1 (deriveTheme.readable). Test src/features/theme/contrast.test.ts chạy qua mọi preset. Trong module chi tiêu mọi 'color: theme.muted' (chữ) đổi thành mutedText; FormField nối lỗi bằng aria-invalid/aria-describedby.
- 2026-11-13 — B3 xong: thuật ngữ (giao dịch, Tiền tệ, Ngày, Đã trả/Đã nhận, lần lặp thay cho kỳ/chuỗi, Xoá thống nhất). Toast/tiêu đề theo kind. CSV thêm cột nhãn đã dịch, tên file theo locale. GIỮ 'Sức khỏe' của danh mục lịch tuần vì phải khớp tên seed trong DB.
- 2026-11-13 — B4 xong: Button size='touch', Input/SelectTrigger/SelectItem cao 44px dưới sm (ảnh hưởng cả app, chỉ trên mobile), Chi/Thu là radiogroup, chip tiền 44px, ô AI 16px, lưới emoji 6 cột. Đo trên trang thử 375px: không còn ô/nút nào < 44px trong form và bảng nháp.
- 2026-11-13 — **KIỂM CHỨNG ĐỢT B: ĐẠT** — 118 test (thêm test tương phản cho mọi theme), typecheck/lint(0 lỗi)/build sạch, kiểm trang thử 375px.
- 2026-11-13 — Đợt C xong trong MỘT commit (các bước phụ thuộc nhau). Khác kế hoạch: (1) desktop dùng hàng tab ở đầu nội dung (ExpenseTopNav) thay vì đưa nav vào sidebar; (2) LedgerBar (chip sổ) giữ nguyên dưới header thay vì dropdown; (3) bảng Thêm giao dịch (AddTransactionSheet: AI | Nhập tay, nhớ chế độ) làm luôn ở đây vì nút ＋ cần nó. Logic con số chính ở utils/overview.ts (+test).
- 2026-11-13 — **KIỂM CHỨNG ĐỢT C: ĐẠT** — 129 test, typecheck/lint(0 lỗi)/build sạch. Trang thử harness.html dựng ExpensesPage thật với dữ liệu giả nạp vào cache TanStack Query: Tổng quan ra 5.930.000 (=8.8tr−2.87tr), 329.444/ngày; 4 tab đổi URL đúng; ＋ mở sheet, Nhập tay tự focus ô tiền; chọn tháng 3 → ?m=2026-03, chip Về tháng này quay lại; desktop có tab trên + nút có chữ, không thanh dưới.
- 2026-11-13 — D1 xong: CategoryGrid (xếp theo lịch sử dùng, utils/addPreferences.ts + test), chip Hôm nay/Hôm qua, 3 nút tiền tệ, nhớ tiền tệ/loại/danh mục theo sổ (localStorage), AI dùng tiền tệ nhớ được, nút 'Lưu & thêm tiếp', tự focus ô tiền. CHƯA làm: chỉnh chiều cao sheet theo visualViewport cho iOS (cần máy thật để kiểm) — để lại cho chủ repo thử trên iPhone.
- 2026-11-13 — D2 xong: hooks/useUndoableActions.ts (xoá trễ 5s, xả ngay khi trang bị ẩn; đã trả & thêm mới có Hoàn tác), components/common/ConfirmDialog.tsx + ConfirmProvider trong AppProviders. Không còn window.confirm trong module chi tiêu (lịch tuần vẫn dùng, ngoài phạm vi). Kiểm trang thử: xoá không hỏi, dòng biến mất, toast có Hoàn tác; xoá danh mục hiện hộp xác nhận theo theme.
