# Kế hoạch: Tuỳ chỉnh giao diện (chọn theme + Theme Studio) dễ dùng hơn

> ## 🔁 BÀN GIAO CHO AI TIẾP THEO — ĐỌC TRƯỚC
>
> 1. File này mới là **đánh giá + kế hoạch**. Chưa sửa dòng code nào. Chủ repo trả lời mục
>    **5. Câu hỏi** trước, rồi mới làm.
> 2. Làm trên một nhánh riêng tách từ `main` (tên do chủ repo chọn, xem Q8). Không push.
> 3. Làm theo thứ tự **Đợt T1 → T4** ở mục 4. Xong mỗi bước: chạy
>    `npm test && npm run typecheck && npm run lint && npm run build`, đánh `[x]`, ghi 1–3 dòng vào
>    **Nhật ký** ở cuối file, rồi commit (một commit mỗi bước, message tiếng Anh).
> 4. Không làm hỏng mức tương phản 4.5:1 mà `src/features/theme/contrast.test.ts` đang bảo đảm.
> 5. Theme tự tạo đã lưu trên Supabase phải mở được và **trông y như cũ** sau mọi thay đổi tham số
>    (xem cách chuyển dữ liệu ở bước T3.1).

> Nguồn: chạy `harness.html` ngày 2026-11-14 ở 3 khổ (1280×800, 768×1024, 375×812 có giả lập cảm ứng),
> đọc toàn bộ `src/features/theme/` (≈4.600 dòng), 4 file ngôn ngữ, `Header.tsx`, `MobileActionBar.tsx`,
> `ExpensesPage.tsx`. Ảnh chụp nằm ngoài repo, trong thư mục ghi chú chung:
> `C:\Users\lemin\AppData\Roaming\Claude\side-session-notes\local_25cc5da4-727b-4768-b152-d70472a66e81\theme-review-shots\`
> (dưới đây viết tắt là `shots/`).

---

## 1. Tóm tắt

Chức năng **chạy ổn về kỹ thuật**: không có lỗi console, đổi 16 preset liên tục không lỗi, kéo thanh trượt
màu không sinh tác vụ dài (đo bằng `PerformanceObserver('longtask')`: 0), có xem trước trực tiếp, có hỏi lại
khi Huỷ lúc đang sửa dở. Nhưng nó được thiết kế cho người hiểu "token", chưa cho người dùng phổ thông:

1. **Studio quá nhiều điều khiển, nhiều cái lộ thuật ngữ.** 5 tab, ~25 điều khiển; tab Màu sắc in tên token
   tiếng Anh (`appBg`, `borderStrong`…), dải cảnh báo chỉ hiện con số "⚠ 6" và tên token. Người dùng chỉ cần
   "màu + sáng/tối + tên".
2. **Chính Studio và bảng chọn đọc khó trên theme sáng.** Chữ trắng gắn cứng trên nút/tab màu nhấn: theme
   Chanh vàng tab đang chọn chỉ **1.96:1**, tab chưa chọn **1.66:1**; nút "Tạo giao diện" vàng trên trắng.
   Commit `65a988d` đã sửa phần còn lại của app nhưng chưa sửa panel này.
3. **Lối vào và thao tác trên điện thoại/máy tính bảng chưa tốt.** Trang Chi tiêu không có lối vào; trên điện
   thoại mục menu tên là "Oải hương" thay vì "Giao diện"; Back không đóng bảng chọn/Studio mà rời trang;
   ở 768px panel Studio che kín lưới lịch, lại không có nút "Giữ để xem"; vùng chạm 28–36px.

Thêm một lỗi logic: sau `65a988d`, công thức vẫn **ép thanh bên tối đi** để chữ trắng đọc được, nên
"Bắt đầu từ Chanh vàng" cho ra thanh bên vàng mù tạt `#caa200` thay vì vàng nhạt `#ffd93d` của preset; cảnh báo
"Thanh bên khó đọc" thì **không bao giờ hiện được** (chứng minh ở mục 2.6).

---

## 2. Kết quả kiểm

### 2.1 Tìm thấy và chọn theme có sẵn

| | Máy tính (≥1280px) | Máy tính bảng (768px) | Điện thoại (375px) |
|---|---|---|---|
| Lối vào ở Lịch tuần | Nút "🎨 Oải hương" trên header, **1 lần bấm** | Như máy tính | ⋯ ở thanh dưới → mục "🎨 Oải hương", **2 lần chạm** |
| Lối vào ở Chi tiêu | **Không có** | **Không có** | **Không có** |
| Ảnh | `shots/01`, `shots/02` | `shots/13`, `shots/14` | `shots/18`, `shots/19`, `shots/20` |

**Phát hiện:**

- **Tên nút là tên theme, không phải chức năng.** Header (`Header.tsx:128-136`) và menu điện thoại
  (`MobileActionBar.tsx:119-122`) hiện "🎨 Oải hương". Người mới không biết "Oải hương" nghĩa là đổi giao
  diện. Trên điện thoại nó lẫn giữa "Copy tuần trước" và "Nhãn dán" (`shots/19`).
- **Trang Chi tiêu không có lối vào** (đã xác nhận bằng `find` trên trang, `shots/10–12`). Theme vẫn áp dụng
  đúng cho trang này (`shots/10`, theme Đêm sao). Tab "Thêm" của Chi tiêu đã có khối "Cài đặt" và "Ngôn ngữ"
  (`shots/12`) — chỗ tự nhiên nhất để thêm "Giao diện". Menu avatar chỉ có "Đăng xuất" (`shots/11`).
- **Bảng chọn:** 16 thẻ dễ phân biệt nhờ dải màu thanh bên + chấm màu nhấn + biểu tượng. Chạm là áp dụng và
  đóng ngay — không có xem trước, nhưng đổi lại được trong 2 chạm nên chấp nhận được. Không có nút đóng
  (`ThemePickerModal.tsx:78`, `showCloseButton={false}`): trên máy tính phải bấm ra ngoài hoặc Esc.
- **Ô "Tạo giao diện" đứng đầu và to bằng một thẻ theme** (`shots/20`): trên điện thoại nó chiếm nửa màn hình
  đầu, đẩy các theme có sẵn (việc chính của 90% người dùng) xuống dưới. Viền + chữ dùng `theme.accent`
  (`ThemePickerModal.tsx:106`) → với Chanh vàng là chữ vàng trên nền trắng (`shots/15`).
- **Nút ⋯ trên thẻ theme tự tạo 24px** (`ThemePickerModal.tsx:131`, `size-6`) — dưới 44px.
- **Back trên điện thoại** (`history.back()`): bảng chọn **không đóng**, trang rời sang mục lịch sử trước. Picker
  và Studio không dùng `useBackToClose` (trang Chi tiêu đã dùng ở 6 chỗ, xem bước M1.1 trong
  `KE_HOACH_DIEN_THOAI.md`).
- **Giữ sau khi tải lại:** có (localStorage `weeklyScheduler.theme`, kiểm bằng đổi key rồi tải lại 3 lần).

### 2.2 Tạo theme mới (luồng chính)

**Số bước tối thiểu:** mở bảng chọn → "Tạo giao diện" → (đã có sẵn tên "Giao diện mới", preset gốc = theme
đang dùng) → Lưu. Tức là **0 quyết định bắt buộc** — nhưng kết quả gần như bản sao theme đang dùng. Để có
theme "của mình" người dùng phải tự tìm sang tab **Màu sắc** đổi Màu chính. Tab mở đầu (Cơ bản) lại bắt đầu bằng
Tên, 16 biểu tượng, Sáng/Tối, rồi 16 thẻ preset — chưa có gì về màu (`shots/03`, `shots/21`).

**Từng tab, từng điều khiển (nhãn đọc ở cả vi/en/ja/zh):**

| Tab | Điều khiển | Người phổ thông hiểu không? | Ghi chú |
|---|---|---|---|
| Cơ bản | Tên | Có | |
| | Biểu tượng (16 emoji + ô dán) | Có | Chiếm nhiều chỗ so với tác dụng |
| | Chế độ Sáng/Tối | Có | Đổi chế độ không đổi preset gốc, kết quả hợp lý |
| | "Bắt đầu từ" (16 preset) | Tạm | Trùng ý với bảng chọn. Đổi preset xoá màu đã sửa (có hỏi lại) |
| Màu sắc | Ngẫu nhiên | Có | Hữu ích, nên giữ |
| | Màu chính | Có | Quan trọng nhất nhưng nằm ở tab thứ 2 |
| | Màu phụ + "Tự động" | Tạm | "Tự động" là link gạch chân 11px |
| | "Vạch giờ hiện tại" (vi) / "Now line" (en) | Khó | Chỉ đổi màu 1 vạch kẻ ngang |
| | Nền thẻ: Trắng/Pha màu/Kem (chỉ theme sáng) | Tạm | Khác biệt rất nhỏ trên màn hình |
| | Độ đậm màu (0–100%) | Tạm | Có tác dụng thấy được. Giá trị mặc định lạ: 32% với Oải hương |
| | Độ tối thanh bên / "Sidebar depth" | Khó | Xem 2.6: mục đích gốc đã hết; trên điện thoại thanh bên bị giấu nên không thấy tác dụng |
| | Màu đường kẻ: Trắng/Theo màu chính (chỉ theme tối) | Khó | Tác dụng rất nhỏ |
| | "Màu suy ra" — 15 ô tên token tiếng Anh, chữ 8px | Không | `ColorsTab.tsx:16-32, 218`. Huy hiệu tương phản gắn nhãn **"Màu chính"** nhưng đo chữ trên nền thẻ (`ColorsTab.tsx:184`) — sai nhãn |
| Trang trí | Hình trang trí (10 hình, chọn 1–6, có số thứ tự) | Tạm | "Số thứ tự là thứ tự lặp lại trên nền" khó hiểu |
| | Màu hình trang trí (1–4 ô mã màu) | Tạm | Tự đi theo 3 màu trên nếu chưa sửa. Nút ＋ 20px, nút × 24px |
| | Ghi chú "Hình trên thanh bên luôn màu trắng" | — | Ghi chú cho giới hạn kỹ thuật, không giúp người dùng |
| Tranh nền | Ảnh nền lưới, độ mờ, vị trí (5 nút) | Có | Có nút "Dùng N%" để sửa độ tương phản — tốt |
| | Ảnh thanh bên | Có | |
| | Nhân vật (≤3): vị trí ngang, chiều cao, độ mờ, lật | Có | Gợi ý **"Kéo nhân vật trực tiếp trên lưới"** là **sai**: `ThemeArtLayer.tsx:71` là `pointer-events-none`, không có code kéo nào (đã `grep` cả `src/`). Cả 4 ngôn ngữ đều hứa điều này |
| Nâng cao | 15 token, chia 4 nhóm `<details>`, tên token tiếng Anh, ô CSS thô cho gradient | Không | Có chủ đích (`AdvancedTab.tsx:11-17`). Chấp nhận được nếu chỉ người rành vào đây. Chạm ô từ tab Màu sắc mở đúng nhóm nhưng **không cuộn tới** ô đó |

**Điều khiển trùng ý:** "Bắt đầu từ" (Studio) ↔ bảng chọn preset; "Màu suy ra" (tab Màu sắc) ↔ tab Nâng cao;
"Độ đậm màu" ↔ "Nền thẻ" (cùng làm nền đậm/nhạt màu hơn); "Màu hình trang trí" ↔ 3 màu chính (đã tự suy ra).

**Xem trước trực tiếp:**
- Máy tính: panel 380px cố định bên phải, app vẫn bấm được. Lưới bị thu hẹp, CN/T7 bị che (`shots/03`).
  **Nút nhãn dán 🌈 nằm đè lên góc nút Lưu** (`shots/04`): `StickersOverlay.tsx:113` dùng `sm:z-[92]`, panel
  là `z-[80]`.
- Máy tính bảng 768px: panel 380px **che gần hết lưới lịch**, chỉ còn thấy thanh bên (`shots/16`). Nút "Giữ để
  xem" và "Thu nhỏ" chỉ hiện khi `isMobile` (< 768px, `ThemeStudioPanel.tsx:177`) → ở 768px không có cách nào
  nhìn lưới.
- Điện thoại: panel là sheet cao 56dvh (`shots/21`), vùng cuộn bên trong chỉ **304px** — thấy được 3 ô màu một
  lúc (`shots/22`). "Giữ để xem" hoạt động (đã thử: panel mờ hẳn khi giữ, hiện lại khi thả) nhưng là cử chỉ
  "nhấn giữ" trên một icon con mắt 28px — khó đoán. "Thu nhỏ" biến panel thành viên thuốc "Mở lại" ở góc phải
  dưới, **đè lên nút ＋ Sự kiện mới và nút ⋯** của thanh dưới (`shots/23`, `shots/24`).
  Thanh bên chỉ xem được khi mở drawer ☰ (`shots/25`) — người dùng sẽ không biết "Độ tối thanh bên" làm gì.

**Cảnh báo tương phản** (đã thử nhập chữ `#dddddd` ở Nâng cao, `shots/08`):
- Một lỗi sinh **6 dòng cảnh báo giống nhau** (`panel`, `modalBg`, `mainBg`, `inputBg`, `appBg`, `chip`).
- Thanh tóm tắt chỉ có "⚠ 6", không có chữ nào (`ThemeStudioPanel.tsx:317-318`).
- Mỗi dòng kèm tên token + tỉ số "1.4:1" — người thường không hiểu.
- Nút Lưu bị mờ đi mà không nói vì sao. Không có nút "Sửa giúp tôi" (trong khi tab Tranh nền có "Dùng N%").
- Huy hiệu "2.3" của chữ phụ hiện **màu xanh (đạt)** dù dưới chuẩn 4.5:1 — vì ngưỡng cảnh báo chữ phụ là 2:1
  (`validate.ts:26`). App thực tế vẽ chữ phụ bằng `mutedText` đã được kéo lên 4.5:1 (`deriveTheme.ts:162`), nên
  token `muted` giờ chỉ còn là "hạt giống" — con số này gây hiểu lầm.

**Lưu / đổi tên / sửa / nhân bản / xoá:** chỉ đọc code, **không kiểm được** (cần đăng nhập Google, xem mục 6).
Bấm Lưu trong harness → toast "Không lưu được giao diện" (đúng như mong đợi khi không có user).
Code: Lưu chọn luôn theme vừa lưu rồi đóng (`ThemeStudioPanel.tsx:106-107`); nhân bản tạo "Tên 2" và dùng
chung ảnh; xoá hỏi lại bằng `window.confirm`. Huỷ khi có thay đổi → hỏi "Bỏ các thay đổi chưa lưu?" (đã kiểm,
chọn Không thì panel vẫn mở, giữ nguyên công). Studio và bảng chọn dùng `window.confirm`, trong khi app đã có
`ConfirmDialog` có hỗ trợ Back.

### 2.3 Hình minh hoạ (tab Tranh nền)

- Trong harness **tab trống trơn** vì `ThemeStudioPanel.tsx:246` chỉ vẽ `ArtTab` khi có `user`. Không thử được
  tải ảnh, cắt, kéo, chụm.
- Đọc code: `ImageCropDialog` có kéo bằng pointer, chụm 2 ngón, `touch-none` trên khung cắt
  (`ImageCropDialog.tsx:148-175, 297`) → về lý thuyết thao tác được bằng ngón tay. Ảnh được giải mã bằng
  `createImageBitmap`, nén lại tối đa 3 lần (`themeImage.ts:67, 111`) → ảnh lớn khó làm treo, nhưng chưa đo trên
  máy yếu.
- Có cảnh báo tranh nền làm chữ khó đọc kèm nút "Dùng N%" — cách làm tốt nên áp cho các cảnh báo khác.
- Gợi ý "kéo nhân vật trên lưới" là sai (2.2).
- Ô chọn nhân vật chỉ nhận PNG/WebP (`ArtTab.tsx:586`) nhưng nút không nói điều này.

### 2.4 Điện thoại riêng

| Hạng mục | Đo được | Đạt ≥44px? |
|---|---|---|
| Nút Giữ để xem / Thu nhỏ / Đóng | 28×28 | ✗ |
| 5 tab | cao 29px | ✗ |
| Huỷ / Lưu | cao 36px | ✗ |
| Emoji biểu tượng | 38×38 | ✗ (gần) |
| Ô nhập | cao 36px, chữ 16px (không bị iOS phóng to) | — |
| Nút ＋/× màu trang trí | 20–24px | ✗ |

- Vùng cuộn trong panel `overscroll-behavior: auto` → cuộn hết panel sẽ cuộn tiếp lưới phía sau.
- Bàn phím che ô nhập: **không kiểm được** trong pane (không có bàn phím ảo). Panel cao 56dvh nên khi bàn phím mở
  sẽ co theo `dvh`; cần thử trên máy thật.
- Một tay: Lưu/Huỷ ở đáy — tốt. Tab và nút đóng ở đỉnh sheet (giữa màn hình) — với tới được.
- Chữ trong panel rất nhỏ: nhãn 11px, gợi ý 10px, tên token 8px, nhãn "Chưa lưu" 9px.

### 2.5 Chất lượng chung

- **Console:** 0 lỗi, 0 cảnh báo trong toàn bộ phiên (3 khổ, đổi 16 preset, 30 lần "Ngẫu nhiên" liên tiếp).
- **Hiệu năng:** kéo "Độ đậm màu" hết dải 2 lần: 0 long task. 30 lần Ngẫu nhiên trong 930ms (kể cả 30ms chờ mỗi
  lần). Trên máy yếu **chưa đo**.
- **Tương phản của chính Studio** (đo `getComputedStyle`):

  | Theme | Tab đang chọn (chữ trắng/nền nhấn) | Tab chưa chọn (`muted`/nền panel) |
  |---|---|---|
  | Oải hương | ≈3.6:1 | ≈2.5:1 (`#a79fc6` trên trắng) |
  | Chanh vàng | **1.96:1** (`shots/17`) | **1.66:1** |

  Nguyên nhân: `color: '#ffffff'` gắn cứng ở `ThemeStudioPanel.tsx:232`, `activeTextColor="#ffffff"` ở
  `BasicsTab.tsx:70`, `ColorsTab.tsx:133, 170`; tab chưa chọn và 3 nút header dùng `savedTheme.muted` thay vì
  `mutedText`. Token `onAccent`/`mutedText` từ `65a988d` đã có sẵn, chỉ chưa dùng ở đây.
- **Bàn phím (máy tính):** tab bấm được bằng Tab/Enter; **Esc không đóng Studio** (đã thử); không có
  `role="tablist"/"tab"` cho 5 tab (dùng `aria-current`). Thanh trượt: `input[type=range]` không có
  `aria-label` riêng, nhãn nằm trên phần tử gốc (`aria-label` ở root) — cần thử với trình đọc màn hình.
- **Theme tối:** Đêm sao trên Chi tiêu đọc tốt (`shots/10`).

### 2.6 Đọc code tìm phần thừa

| Phần | Bằng chứng | Kết luận |
|---|---|---|
| Kẹp thanh bên `SIDEBAR_MIN_WHITE_CONTRAST = 2.4` | `buildTheme.ts:85, 169`; chú thích dòng 79-84 nói "`Sidebar` hardcodes white text" — đã sai sau `65a988d` (`deriveTheme.ts:111-119` tự chọn chữ trắng/tối) | **Thừa và có hại**: làm thanh bên theme tự tạo tối hơn preset gốc. Đo: Chanh vàng `#ffd93d`→`#caa200`, Đào `#ffab7a`→`#f58b5e`, Anh đào `#ffb0c9`→`#eb8aa8`, Dâu tây `#ff86ac`→`#e58daa` |
| `sidebarDepth` (0..1, chỉ làm tối) | `recipe/types.ts:43-48`: "0 is the lightest sidebar that still passes the white-text guard" | Lý do tồn tại đã hết. Vẫn có tác dụng thẩm mỹ (làm tối, `shots/06`) nhưng **không làm sáng được** |
| Cảnh báo `themeIssueSidebar` | `validate.ts:143-152`: lấy `max(tương phản trắng, tương phản đen)` rồi so với 4.5 | **Code chết**: với mọi màu, tích hai tỉ số = 21 nên max ≥ √21 ≈ 4.58 > 4.5 → không bao giờ hiện |
| Chuỗi `studioDarkenSidebar` | `vi.ts:200` + 3 file ngôn ngữ, `dictionary.ts:227`; không chỗ nào dùng | Chuỗi chết, xoá |
| Action `'saved'` của reducer | `useStudioDraft.ts:53, 143`; không có `dispatch({ type: 'saved' })` nào | Code chết (Studio đóng ngay sau khi lưu) |
| `intensity` khi dựng lại preset | Đo `recipeFromDefinition`: Đêm sao, Chanh vàng, Cơ bản tối kẹp ở **1**; Gấu trúc, Cơ bản kẹp ở **0** | Thanh trượt không đủ dải để tái tạo 5/16 preset; "Bắt đầu từ X" ≠ X |
| `lineTint` | Chỉ theme tối, chỉ đổi alpha đường kẻ 4 token | Tác dụng rất nhỏ → Nâng cao |
| `paper` | 3 lựa chọn, panel L 1.000/0.995/0.993 | Tác dụng nhỏ → Nâng cao |
| Ghi chú `studioSidebarShapeNote` | `DecorTab.tsx:127` | Không giúp người dùng → bỏ |
| `studioFiguresHint` | Hứa tính năng không có | Sửa chữ hoặc làm tính năng (Q5) |

Không thấy file/thư mục nào trong `src/features/theme/` không được dùng. Toàn bộ chuỗi `studio*`/`theme*` khác
đều được dùng (đã đối chiếu tự động từng khoá).

---

## 3. Bảng Giữ / Tinh chỉnh / Bỏ hoặc giấu vào Nâng cao

### Bảng chọn theme

| Điều khiển | Quyết định | Lý do / cách làm |
|---|---|---|
| Lưới 16 preset, chạm là áp dụng | **Giữ** | Nhanh, đổi lại dễ |
| Nhãn lối vào "🎨 Oải hương" | **Tinh chỉnh** | "🎨 Giao diện" (máy tính có thể thêm tên theme nhỏ bên cạnh) |
| Lối vào ở Chi tiêu | **Thêm** (Q1) | Tab Thêm → Cài đặt → "Giao diện"; máy tính thêm vào menu avatar |
| Ô "Tạo giao diện" to đứng đầu | **Tinh chỉnh** | Đưa preset lên đầu; "Của tôi" + nút tạo nhỏ gọn (một hàng) ở dưới, hoặc ẩn khi chưa có theme tự tạo và thay bằng nút chữ |
| Nút ⋯ trên thẻ tự tạo 24px | **Tinh chỉnh** | ≥ 44px vùng chạm |
| Không có nút đóng | **Tinh chỉnh** | Thêm nút ✕ hoặc thanh kéo; Back đóng (`useBackToClose`) |
| Màu nút tạo dùng `accent` | **Sửa** | Dùng `accentText` |
| Thêm "Tạo từ theme này" vào preset | **Thêm** (thay "Bắt đầu từ" trong Studio) | Nhấn giữ / menu ⋯ trên thẻ preset |

### Theme Studio

| Điều khiển | Quyết định | Ghi chú |
|---|---|---|
| Tên | **Giữ** | Đưa lên đầu tab chính |
| Biểu tượng | **Tinh chỉnh** | Thu gọn: 1 ô hiện emoji, chạm mới mở lưới 16 |
| Sáng / Tối | **Giữ** | |
| Màu chính | **Giữ, đưa lên tab đầu** | Thêm hàng ~10 màu gợi ý (pastel/đậm) trước ô mã màu |
| Ngẫu nhiên | **Giữ** | |
| Màu phụ + Tự động | **Tinh chỉnh** | Mặc định "Tự động" bật (công tắc), tắt mới hiện ô màu |
| Bắt đầu từ (16 preset) | **Bỏ khỏi Studio** | Chuyển sang bảng chọn ("Tạo từ theme này"); Studio mở từ theme đang dùng như hiện nay |
| Vạch giờ hiện tại | **Giấu vào Nâng cao** | Tự suy từ màu chính như `defaultDecorColors` |
| Độ đậm màu | **Giữ, đổi nhãn** | "Màu nhạt ↔ Màu rực", bỏ con số % |
| Nền thẻ (Trắng/Pha màu/Kem) | **Giấu vào Nâng cao** | |
| Độ tối thanh bên | **Thay** | Bỏ kẹp 2.4; thành "Thanh bên: Nhạt · Vừa · Đậm" (3 nút) và giấu vào Nâng cao (Q3) |
| Màu đường kẻ (tối) | **Giấu vào Nâng cao** | |
| Màu suy ra (15 ô token) | **Bỏ khỏi tab chính** | Đã có ở Nâng cao; thay bằng 1 dòng "Độ dễ đọc: Tốt / Cần sửa" |
| Huy hiệu tương phản "Màu chính 8.5" | **Sửa** | Nhãn sai; gộp vào dòng "Độ dễ đọc" ở trên |
| Hình trang trí | **Giữ** | Bỏ số thứ tự và câu gợi ý khó hiểu (thứ tự vẫn lưu như cũ) |
| Màu hình trang trí | **Giấu vào Nâng cao** | Đã tự đi theo màu chính |
| Ghi chú hình thanh bên luôn trắng | **Bỏ** | |
| Tranh nền: ảnh, độ mờ, vị trí, ảnh thanh bên | **Giữ** | |
| Nhân vật | **Giữ**, sửa gợi ý sai (Q5) | |
| Nâng cao: sửa từng token | **Giữ** (Q4) | Thêm cuộn tới ô khi nhảy từ cảnh báo |
| Dải cảnh báo | **Tinh chỉnh** | Gộp các lỗi "chữ trên bề mặt" thành 1 dòng bằng lời, có nút "Sửa tự động" (xoá override gây lỗi) |
| Giữ để xem / Thu nhỏ | **Tinh chỉnh** | Hiện cả ở 768–1023px; "Giữ để xem" thành nút bật/tắt "Xem trước" có chữ; viên thuốc "Mở lại" không đè thanh dưới |
| Huỷ (hỏi lại) | **Giữ** | Đổi `window.confirm` sang `ConfirmDialog` |

**Kết quả mong muốn:** 5 tab → 3 tab: **Màu** (tên, biểu tượng, sáng/tối, màu chính, màu phụ tự động, độ rực,
ngẫu nhiên, độ dễ đọc), **Trang trí** (hình + tranh nền + nhân vật), **Nâng cao** (mọi thứ còn lại). Luồng
chính: Tạo → chọn 1 màu → (sáng/tối) → đặt tên → Lưu, tất cả trong tab đầu, không phải cuộn trên máy tính.

---

## 4. Kế hoạch sửa

> Thứ tự: sửa lỗi nhìn thấy trước (T1), rồi lối vào (T2), rồi logic màu (T3), cuối cùng mới sắp xếp lại
> Studio (T4) — T4 đụng nhiều file nhất và phụ thuộc câu trả lời Q2–Q4.

### Checklist tổng

**Đợt T1 — Lỗi đọc khó và che khuất (không đổi bố cục)**
- [x] T1.1 Studio dùng `onAccent`/`mutedText`/`accentText` thay màu gắn cứng
- [x] T1.2 Nút nhãn dán không đè nút Lưu; viên "Mở lại" không đè thanh dưới
- [x] T1.3 Sửa chữ sai: huy hiệu "Màu chính", gợi ý kéo nhân vật
- [x] T1.4 Xoá code chết: cảnh báo thanh bên, `studioDarkenSidebar`, action `'saved'`

**Đợt T2 — Lối vào và điều hướng**
- [x] T2.1 Nhãn lối vào "Giao diện"
- [x] T2.2 Lối vào ở trang Chi tiêu (chờ Q1)
- [x] T2.3 Back/Esc đóng bảng chọn và Studio; `ConfirmDialog` thay `window.confirm`
- [x] T2.4 Bảng chọn: preset lên đầu, nút đóng, vùng chạm ≥ 44px

**Đợt T3 — Logic màu (chờ Q3)**
- [x] T3.1 Bỏ kẹp 2.4 cho thanh bên, chuyển dữ liệu cũ không đổi hình
- [x] T3.2 Cảnh báo bằng lời, gộp lỗi trùng, nút "Sửa tự động"

**Đợt T4 — Sắp xếp lại Studio (chờ Q2, Q4)**
- [x] T4.1 Gộp còn 3 tab; luồng chính trong tab đầu
- [x] T4.2 Xem trước ở máy tính bảng; vùng chạm ≥ 44px; `overscroll-behavior: contain`
- [x] T4.3 Chuyển "Bắt đầu từ" sang bảng chọn

---

### T1.1 Màu chữ trong Studio theo token mới
- **Vấn đề:** chữ trắng trên nút nhấn vàng 1.96:1, tab chưa chọn 1.66:1 (2.5).
- **Làm:** `ThemeStudioPanel.tsx:232` → `chrome.onAccent`; tab chưa chọn và 3 nút header → `mutedText`;
  `activeTextColor` ở `BasicsTab.tsx:70`, `ColorsTab.tsx:133, 170` → `chrome.onAccent`; `ThemePickerModal.tsx:106`
  `color` → `theme.accentText`. Tìm thêm: `grep -rn "'#ffffff'\|\"#ffffff\"" src/features/theme`.
- **Xong khi:** trên harness với `lemon`, `peach`, `sakura`, `lavender`, `midnight`: tab đang chọn, tab chưa chọn,
  nút Sáng/Tối đều ≥ 4.5:1 (đo bằng `getComputedStyle` như mục 2.5). Có ảnh trước/sau.
- **Ưu tiên:** Cao · **Công:** 0.5 giờ · **Rủi ro:** thấp.

### T1.2 Không che nút Lưu và thanh dưới
- **Làm:** khi Studio mở, ẩn nút nhãn dán (hoặc hạ `z` xuống dưới 80) — `StickersOverlay.tsx:113`. Viên "Mở lại"
  (`ThemeStudioPanel.tsx:125`) trên điện thoại đặt **trên** thanh dưới (`bottom: calc(72px + safe-area)`) hoặc ở
  góc trên.
- **Xong khi:** ảnh 1280px thấy trọn nút Lưu; ảnh 375px thu nhỏ thấy đủ ＋ và ⋯.
- **Ưu tiên:** Cao · **Công:** 0.5 giờ · **Rủi ro:** thấp.

### T1.3 Sửa chữ sai
- **Làm:** `ColorsTab.tsx:184` đổi nhãn huy hiệu thành "Chữ" (hoặc bỏ khi làm T3.2). `studioFiguresHint` ở 4 ngôn ngữ:
  nếu Q5 = không làm kéo, đổi thành "Dùng thanh trượt bên dưới để đặt vị trí".
- **Xong khi:** không còn chuỗi nào hứa tính năng không có.
- **Ưu tiên:** Vừa · **Công:** 15 phút · **Rủi ro:** không.

### T1.4 Xoá code chết
- **Làm:** xoá khối kiểm thanh bên ở `validate.ts:143-152`, `sidebarWarn` ở `CONTRAST_LIMITS`, chuỗi
  `themeIssueSidebar` (nếu không dùng nữa) và `studioDarkenSidebar` ở 4 ngôn ngữ + `dictionary.ts`; action
  `'saved'` ở `useStudioDraft.ts`. Thêm 1 test: với 16 preset và 200 màu ngẫu nhiên, `validateTheme` không trả
  `themeIssueSidebar` (để ghi lại vì sao xoá) — hoặc chỉ ghi trong commit message.
- **Xong khi:** `npm test && npm run typecheck && npm run lint` xanh; `grep -rn studioDarkenSidebar src` rỗng.
- **Ưu tiên:** Thấp · **Công:** 20 phút · **Rủi ro:** không.

### T2.1 Nhãn lối vào
- **Làm:** `MobileActionBar.tsx:121` → `t.theme` mới ("Giao diện"/"Theme"/"テーマ"/"主题"). `Header.tsx:135` giữ tên
  theme nhưng thêm `aria-label`/`title` "Giao diện: {tên}" (hoặc đổi hẳn, Q1).
- **Xong khi:** menu ⋯ điện thoại hiện "🎨 Giao diện".
- **Ưu tiên:** Cao · **Công:** 20 phút · **Rủi ro:** không.

### T2.2 Lối vào ở Chi tiêu
- **Làm (nếu Q1 = có):** đưa `ThemePickerModal` + `ThemeStudioPanel` + state `studioTarget` ra một hook/thành phần
  dùng chung (`useThemePicker()` trả về `open()` và phần JSX), dùng ở `SchedulerPage.tsx:280-292` và `ExpensesPage`.
  Thêm dòng "Giao diện" vào khối Cài đặt của tab Thêm; trên máy tính thêm vào menu avatar.
- **Xong khi:** `harness.html` (Chi tiêu) mở được bảng chọn trong ≤ 2 chạm ở 375px và ≤ 2 bấm ở 1280px; đổi theme
  áp dụng ngay; Studio mở được và xem trước trên trang Chi tiêu.
- **Ưu tiên:** Cao · **Công:** 2 giờ · **Rủi ro:** vừa — Studio xem trước trên trang Chi tiêu chưa từng được thử
  (bố cục khác, không có lưới giờ).

### T2.3 Back / Esc
- **Làm:** `useBackToClose(open, …)` cho `ThemePickerModal`; cho Studio dùng `useBackToClose(true, close)` (đi qua
  hỏi lại nếu có thay đổi). Esc khi focus nằm trong Studio → `close()`. Đổi 3 chỗ `window.confirm` (Studio Huỷ,
  đổi preset, xoá theme) sang `ConfirmDialog`.
- **Xong khi:** trên harness 375px: mở bảng chọn → `history.back()` → bảng đóng, URL không đổi; mở Studio, sửa 1 màu
  → Back → hỏi lại → Không → Studio vẫn mở.
- **Ưu tiên:** Cao · **Công:** 1.5 giờ · **Rủi ro:** vừa — xem chú ý thứ tự `useLayoutEffect` trong
  `ExpensesPage.tsx:148`.

### T2.4 Bảng chọn gọn hơn
- **Làm:** khối "Có sẵn" lên trước; "Của tôi" xuống dưới, nút tạo thành hàng ngang cao 48px (không phải thẻ 118px);
  nút ✕ ở góc; ⋯ thẻ tự tạo `size-11` vùng chạm (icon vẫn nhỏ).
- **Xong khi:** ở 375px màn hình đầu thấy ≥ 6 preset; mọi nút ≥ 44px.
- **Ưu tiên:** Vừa · **Công:** 1 giờ · **Rủi ro:** thấp.

### T3.1 Bỏ kẹp 2.4 cho thanh bên (cần Q3)
- **Vấn đề:** 2.6. Theme tự tạo tối hơn preset gốc; "Bắt đầu từ Chanh vàng" không ra Chanh vàng.
- **Làm:**
  1. Thêm trường tuỳ chọn `recipe.v` (số phiên bản công thức). Schema: `v: z.literal(2).optional()`.
     Bản ghi **không có `v`** (mọi theme đã lưu) → `buildTokensFromRecipe` chạy đúng như hôm nay, **vẫn kẹp 2.4**
     → trông y như cũ, không cần sửa dữ liệu trên Supabase.
  2. Recipe mới (`v: 2`): không gọi `withWhiteContrastAtLeast`; `sidebarDepth` thành dải hai chiều quanh độ sáng
     của preset gốc (0.5 = như preset), hoặc 3 nấc Nhạt/Vừa/Đậm (Q3). `recipeFromDefinition` tạo `v: 2`.
  3. Khi người dùng mở và **lưu lại** một theme cũ: giữ `v` như cũ (không tự nâng cấp), chỉ nâng khi họ đổi preset
     gốc hoặc bấm một nút "Cập nhật kiểu thanh bên mới" (Q3).
  4. `deriveTheme` đã chọn chữ trắng/tối đạt 4.5:1 cho mọi thanh bên → `contrast.test.ts` vẫn đúng; thêm test: dựng
     lại 16 preset bằng `v: 2` thì mid-stop thanh bên lệch ≤ ΔE nhỏ so với preset (đặc biệt `lemon`, `peach`,
     `sakura`), và `sidebarText` đạt ≥ 4.5:1 trên mọi điểm dừng.
- **Xong khi:** test mới xanh; Studio "Bắt đầu từ Chanh vàng" ra thanh bên vàng nhạt (ảnh so với `shots/16`);
  một bản ghi JSON cũ (lấy từ `parseCustomTheme` test fixture) dựng ra token giống hệt trước khi sửa.
- **Ưu tiên:** Vừa · **Công:** 3 giờ · **Rủi ro:** vừa — đụng `schemas/customThemeSchema.ts` (bản ghi sai schema bị
  loại khỏi danh sách), phải chắc `v` là optional.

### T3.2 Cảnh báo bằng lời
- **Làm:** gộp mọi `themeIssueTextSurface` thành 1 dòng "Chữ khó đọc trên nền — do màu bạn sửa ở Nâng cao"; thanh
  tóm tắt có chữ ("1 vấn đề cần sửa" thay vì "6"); nút "Sửa tự động" = xoá các override gây lỗi (`clearOverride`
  cho `text` và các bề mặt); ẩn tên token và tỉ số sau một nút "Chi tiết". Nút Lưu bị khoá thì dòng cảnh báo tự mở.
  Bỏ huy hiệu chữ phụ hoặc đổi ngưỡng hiển thị cho khớp `mutedText` thật.
- **Xong khi:** nhập `#dddddd` cho chữ → thấy đúng 1 dòng bằng lời + nút sửa; bấm → Lưu bật lại.
- **Ưu tiên:** Vừa · **Công:** 2 giờ · **Rủi ro:** thấp.

### T4.1 Ba tab, luồng chính trong tab đầu (cần Q2, Q4)
- **Làm:** theo bảng mục 3. Tab "Màu": Tên · Sáng/Tối · Màu chính (hàng gợi ý + ô mã) · Ngẫu nhiên · Màu phụ (Tự
  động bật) · Màu nhạt↔rực · Độ dễ đọc. Biểu tượng thu gọn. Tab "Trang trí" = Trang trí + Tranh nền. "Nâng cao" =
  Nền thẻ, Thanh bên, Đường kẻ, Vạch giờ, Màu hình trang trí, sửa từng token. Không đổi `ThemeRecipe` ở bước này
  (chỉ đổi chỗ hiển thị) → không cần chuyển dữ liệu.
- **Xong khi:** ở 1280px tab đầu không cần cuộn; tạo theme mới chỉ đổi màu chính + tên + Lưu = 3 thao tác sau khi
  mở Studio; cả 4 ngôn ngữ đủ chuỗi.
- **Ưu tiên:** Vừa · **Công:** 4 giờ · **Rủi ro:** vừa — `ArtTab` 600 dòng chuyển vào tab mới; cần giữ
  `onBusyChange` khoá Lưu khi đang tải ảnh.

### T4.2 Máy tính bảng và điện thoại
- **Làm:** nút xem trước/thu nhỏ hiện khi < 1024px (không chỉ < 768px); ở 768–1023px panel hẹp hơn (320px) hoặc là
  sheet dưới như điện thoại; "Giữ để xem" thành nút bật/tắt có chữ "Xem trước"; mọi nút header/tab/footer ≥ 44px;
  vùng cuộn `overscroll-behavior: contain`; chữ nhỏ nhất 12px.
- **Xong khi:** ảnh 768px thấy được ít nhất 3 cột ngày khi Studio mở (hoặc bật Xem trước); bảng đo 2.4 toàn ✓.
- **Ưu tiên:** Vừa · **Công:** 2 giờ · **Rủi ro:** thấp.

### T4.3 "Tạo từ theme này" trong bảng chọn
- **Làm:** menu trên thẻ preset (hoặc nhấn giữ) → mở Studio với `basePreset` = preset đó. Bỏ lưới 16 preset khỏi
  Studio. Đổi `reseed` thành tuỳ chọn trong Nâng cao ("Đặt lại theo preset…") nếu Q2 muốn giữ.
- **Xong khi:** tạo theme từ "Đêm sao" không cần đổi theme đang dùng trước.
- **Ưu tiên:** Thấp · **Công:** 1.5 giờ · **Rủi ro:** thấp.

---

## 5. Câu hỏi cho chủ repo

- **Q1.** Thêm lối vào chọn giao diện ở trang **Chi tiêu** không? Nếu có: đặt ở tab **Thêm → Cài đặt** (đề xuất) và
  menu avatar trên máy tính? Nút trên header Lịch tuần đổi thành "🎨 Giao diện" hay giữ tên theme?
- **Q2.** Đồng ý gộp Studio từ **5 tab còn 3** (Màu / Trang trí / Nâng cao) và bỏ lưới "Bắt đầu từ" khỏi Studio?
- **Q3.** Thanh bên của theme tự tạo: cho phép **nhạt như preset** (bỏ kẹp) không? Nếu có — dạng thanh trượt hai
  chiều hay 3 nút Nhạt/Vừa/Đậm? Theme đã lưu giữ nguyên hình (đề xuất) hay tự cập nhật sang kiểu mới?
- **Q4.** Có ai thật sự dùng tab **Nâng cao** (sửa từng token, gõ CSS gradient) không? Giữ nguyên, giấu sau một
  công tắc "Chế độ chuyên gia", hay bỏ hẳn? (Bỏ thì `overrides` cũ vẫn phải được áp dụng khi dựng theme.)
- **Q5.** "Kéo nhân vật trực tiếp trên lưới" — làm tính năng này, hay chỉ sửa câu gợi ý cho đúng?
- **Q6.** Bảng chọn có cần **xem trước trước khi áp dụng** (chạm = xem thử, có nút "Dùng") không, hay giữ "chạm là
  đổi"? (Đề xuất: giữ, vì đổi lại chỉ 2 chạm.)
- **Q7.** Giới hạn 20 theme tự tạo và 3 nhân vật có cần đổi không?
- **Q8.** Làm trên nhánh nào? (`feat/ux-overhaul` đã gộp vào `main`; đề xuất nhánh mới `feat/theme-ux` từ `main`.)

---

## 6. Những gì chưa kiểm được

| Hạng mục | Lý do | Cách kiểm |
|---|---|---|
| Lưu, sửa lại, đổi tên, nhân bản, xoá theme tự tạo | Harness không có user; đăng nhập chỉ bằng Google | Chủ repo thử trên bản dev/production đã đăng nhập |
| Toàn bộ tab Tranh nền (tải, cắt, chụm, kéo, ảnh lớn) | `ArtTab` chỉ vẽ khi có `user` (`ThemeStudioPanel.tsx:246`) + cần Supabase Storage | Như trên, nên thử thêm ảnh 10–20MB trên điện thoại tầm trung |
| Ảnh nền làm chữ khó đọc trong thực tế | Cần tải ảnh | Như trên |
| Bàn phím ảo che ô nhập Tên/mã màu | Pane không có bàn phím ảo | iPhone Safari + PWA, Android Chrome |
| Nút Back cứng / vuốt Back trên máy thật | Chỉ giả bằng `history.back()` | Android, iPhone PWA |
| Trình đọc màn hình (nhãn thanh trượt, tab) | Không có VoiceOver/TalkBack trong pane | VoiceOver trên iPhone hoặc NVDA |
| Hiệu năng kéo thanh trượt trên máy yếu | Không bật được CPU throttle | Chrome remote DevTools trên Android tầm thấp |
| Giao diện ja/zh/en bằng mắt | Chỉ đọc chuỗi trong `locales/` | Đổi ngôn ngữ trên harness, chụp 3 khổ |
| Theme tự tạo đồng bộ giữa 2 thiết bị | Cần tài khoản thật | Đăng nhập 2 máy |

---

## Nhật ký

- 2026-11-14 — Đánh giá xong, viết file này. Chưa sửa code. Chờ chủ repo trả lời Q1–Q8.
- 2026-11-14 (lượt 2) — Chủ repo bảo "thực hiện tất cả các bước" mà chưa trả lời Q1–Q8, nên đã làm theo **phương án đề
  xuất** cho từng câu (bảng dưới; muốn khác thì báo, đều đổi được). Làm trên nhánh hiện có `feat/ux-overhaul`
  (phiên này không được đổi nhánh). **Chưa commit.** Đã chạy: `npm test` 334/334 (thêm
  `recipe/buildTheme.test.ts`), `typecheck` sạch, `lint` 0 lỗi (15 cảnh báo fast-refresh cùng loại đã có, +1 của
  `ThemeUiProvider.tsx`), `build` đạt. Kiểm trên harness ở 1280×800, 768×1024, 375×812; 0 lỗi console.

  | Câu | Đã chọn |
  |---|---|
  | Q1 | Có lối vào ở Chi tiêu: tab **Thêm → Cài đặt → Giao diện**, và mục **Giao diện** trong menu avatar (cả hai trang). Header Lịch tuần giữ tên theme, thêm `aria-label`/`title` "Giao diện: …"; menu ⋯ điện thoại ghi "🎨 Giao diện" |
  | Q2 | Gộp còn 3 tab Màu sắc / Trang trí / Nâng cao; bỏ lưới "Bắt đầu từ" khỏi Studio, thay bằng ⋯ → "Tạo từ giao diện này" trên từng thẻ preset |
  | Q3 | Bỏ kẹp với công thức mới (`recipe.v = 2`), thanh trượt "Thanh bên: Nhạt ↔ Đậm" trong Nâng cao. Theme đã lưu (không có `v`) giữ kẹp cũ; có nút "Cho phép thanh bên nhạt hơn" để chuyển, không đổi màu lúc bấm |
  | Q4 | Giữ Nâng cao (sửa từng màu), thêm khối "Tuỳ chỉnh thêm" ở đầu tab |
  | Q5 | Chỉ sửa câu gợi ý (4 ngôn ngữ) |
  | Q6 | Giữ "chạm là đổi" |
  | Q7 | Không đổi |
  | Q8 | Nhánh hiện tại `feat/ux-overhaul`, chưa commit |

  **Đã làm, theo bước:**
  - **T1.1** Tab, nút Sáng/Tối, nút chọn đều dùng `accentFill`/`onAccent`/`mutedText`/`accentText`. Đo lại theme
    Chanh vàng: tab đang chọn 1.96 → **4.63:1**, tab chưa chọn 1.66 → **4.9:1**, nút Sáng/Tối **4.63:1**. Dấu ✓ trên
    thẻ theme dùng mực tối cố định thay vì màu nhấn.
  - **T1.2** `StickersOverlay` ẩn khi Studio mở (đo bằng `elementFromPoint` ở góc nút Lưu → chính nút Lưu). Nút
    "Tiếp tục chỉnh" trên điện thoại ở 680–728px, thanh dưới ở 759–803px — không đè.
  - **T1.3** Bỏ huy hiệu "Màu chính 8.5" (đo sai thứ); gợi ý nhân vật nói đúng (dùng thanh trượt, PNG/WebP nền trong).
  - **T1.4** Xoá kiểm tra `themeIssueSidebar` (không thể hiện), `sidebarWarn`, action `'saved'`, `'reseed'`, các chuỗi
    `studioDarkenSidebar`, `studioSidebarShapeNote`, `studioTokens*`, `studioBasedOn`, `studioReseedConfirm`,
    `studioTabBasics`, `studioTabArt`, `themeIssueSidebar`; xoá `BasicsTab.tsx`.
  - **T2.1** Như Q1.
  - **T2.2** Bảng chọn + Studio chuyển vào `features/theme/components/ThemeUiProvider.tsx` (gắn trong
    `AppProviders`), trang nào cũng gọi `useThemeUi().openThemePicker()`. `ExpensesPage` co lại bên cạnh Studio
    như Lịch tuần (`insetRight`). Đã mở Studio và xem trước trên trang Chi tiêu.
  - **T2.3** `useBackToClose` cho bảng chọn và Studio; Esc trong Studio; `ConfirmDialog` thay 3 chỗ
    `window.confirm` (nút "Bỏ thay đổi"). Back khi có thay đổi → hỏi; Hủy → Studio vẫn mở và Back lần sau vẫn hỏi
    (lớp lịch sử được gắn lại); "Bỏ thay đổi" → đóng, URL không đổi. **Lỗi tìm ra khi kiểm:** đi từ bảng chọn sang
    Studio để lại mục lịch sử mồ côi làm mất lần Back đầu; sửa bằng `whenHistorySettles` trong `ThemeUiProvider`.
  - **T2.4** "Có sẵn" lên đầu (375px thấy 8 preset ở màn hình đầu), "Của tôi" + nút tạo cao 48px ở dưới, nút ✕,
    nút ⋯ vùng chạm 44px nằm trong thẻ; biểu tượng theme chuyển xuống góc dưới thẻ.
  - **T3.1** `recipe.v = 2`: `SIDEBAR_V2` (light 0.93→0.43, dark 0.42→0.14), schema khai báo `v` (thiếu thì
    `z.object` bỏ khoá và theme mới quay về kiểu cũ sau khi tải lại). "Tạo từ Chanh vàng" giờ cho thanh bên vàng nhạt
    như preset (test: lệch độ sáng < 0.03 cho lemon/peach/sakura).
    **Phát hiện thêm khi viết test:** gradient thanh bên dựng từ công thức — cả kiểu **cũ** — thường không đạt 4.5:1
    với bất kỳ màu chữ nào: ở thanh trượt 75–100% còn 2.4–4.4:1, mọi theme tối 2.5–4.4:1 (đầu dưới pha màu phụ quá
    sáng). Thêm `readableSidebar()` trong `buildTheme.ts`: gradient nào đã đạt thì giữ nguyên; chưa đạt thì thu hai đầu
    về điểm giữa, rồi đẩy cả dải ra khỏi vùng lưng chừng. Áp cho cả theme cũ, nên **theme đã lưu nào đang có chữ
    thanh bên dưới 4.5:1 sẽ đổi nhẹ** (thanh bên đậm/đều màu hơn); theme đang đạt thì không đổi. Test: 16 preset dựng
    lại ở thanh trượt 0 và 1 đều ≥ 4.5:1. Để tách hàm, `deriveTheme.ts` export `sidebarTextFor()` (cùng logic cũ).
  - **T3.2** Dải cảnh báo: "N vấn đề cần sửa", gộp mọi lỗi "chữ trên nền" thành 1 dòng bằng lời, nút
    "Sửa tự động" (bỏ các màu sửa tay liên quan) và "Dùng N%" cho tranh nền; chạm dòng nhảy tới ô màu ở Nâng cao
    (có cuộn tới). Đã thử: chữ `#dddddd` → 1 dòng + nút → bấm → Lưu bật lại. Tab Màu có dòng "Độ dễ đọc".
  - **T4.1** Tab Màu sắc: tên + nút biểu tượng (mở lưới emoji khi chạm), Sáng/Tối, 10 màu gợi ý + ô mã màu,
    Ngẫu nhiên, công tắc "Màu phụ tự động", "Độ rực màu" (Nhạt ↔ Rực), Độ dễ đọc — ở 1280px không phải cuộn. Tab Trang
    trí = hình trang trí + tranh nền + nhân vật. Nâng cao = Nền thẻ, Thanh bên, Màu đường kẻ, Vạch giờ, Màu hình
    trang trí, rồi sửa từng màu.
  - **T4.2** Dưới 1024px Studio là sheet dưới (60dvh) có nút "Xem trước" có chữ (gộp "giữ để xem" và "thu nhỏ"); từ
    1024px là dock 380px (`AppShell` dùng `lg:mr-[406px]`). Mọi nút header/tab/footer 44px ở khổ hẹp (đo được); vùng
    cuộn `overscroll-behavior: contain`; `ColorField` dùng chung có ô 44px và chữ 16px dưới 768px (iOS không phóng to).
    ArtTab: nút cắt/xoá 36–44px, nút thêm nhân vật 44px, chữ gợi ý 12px.
  - **T4.3** Như Q2. Đã thử: đang dùng Chanh vàng, ⋯ trên Đêm sao → Studio mở ở chế độ Tối với màu Đêm sao.

  **Ảnh sau khi sửa** (`shots/after-01` … `after-09`): lối vào ở Chi tiêu (điện thoại), Studio trên Chi tiêu và Lịch
  tuần (máy tính), cảnh báo bằng lời, sheet + Xem trước ở 768px, bảng chọn và Studio "tạo từ Đêm sao" ở 375px.

  **Vẫn chưa kiểm được** (mục 6 giữ nguyên): lưu/sửa/nhân bản/xoá thật trên Supabase, tab Tranh nền, nút "Cho phép
  thanh bên nhạt hơn" trên một theme đã lưu thật, bàn phím ảo, Back cứng trên máy thật, trình đọc màn hình. Ảnh chụp
  trong pane đôi khi là khung hình cũ (bảng chọn còn hiện sau khi đã rời DOM) vì pane không có focus — đã đối chiếu
  bằng DOM mỗi lần.
- 2026-11-14 (lượt 3) — Kiểm các luồng cần đăng nhập bằng **Supabase giả tạm thời** (theo yêu cầu chủ repo):
  `harness.html?scheduler&fakeuser` → `AuthContext` tạo user giả, `customThemesApi` lưu vào localStorage
  (`tmpTest.customThemes`), ảnh là `blob:` URL, `customThemeSchema` tạm nhận `blob:`. Mọi dòng giả đánh dấu
  `TẠM TEST`, **không commit**, gỡ bằng `git restore` 3 file đó. Kết quả (1280×800):
  - Tạo → đặt tên, chọn màu → Lưu: theme được chọn ngay, header đổi tên; tải lại vẫn giữ, `recipe.v = 2` còn nguyên.
  - Sửa: mở đúng dữ liệu đã lưu; Huỷ khi chưa đổi gì → đóng, không hỏi. Đổi tên + màu → Lưu → cập nhật đúng 1 bản ghi.
  - Nhân bản → "… 2" hiện ngay. Xoá theme đang dùng → hỏi lại → xoá, app quay về preset, bản nhân bản còn.
  - Tranh nền: chọn ảnh 1600×900 (PNG 1.2MB) → hộp cắt ảnh → Áp dụng: hiện trên lưới sau ~0.5 giây. Esc trong hộp
    cắt chỉ đóng hộp cắt, Studio còn nguyên. Cảnh báo "Tranh nền làm chữ khó đọc (3.6:1)" + "Dùng 31%" → bấm → hết
    cảnh báo. Nhân vật PNG nền trong → hiện trên lưới; lưu theme có tranh + nhân vật được.
  - Theme kiểu cũ (không có `v`): dựng ra y như trước (thanh bên `#caa200`); nút "Cho phép thanh bên nhạt hơn" →
    thanh bên giữ nguyên màu, nút biến mất, lưu ra `v: 2`.
  - **Hai lỗi có sẵn tìm ra và đã sửa (cần commit):** React cảnh báo trộn `background` với thuộc tính riêng —
    `ThemeArtLayer.tsx` (`background` + `backgroundAttachment`, mỗi lần đổi tranh/vị trí) và `ImageDropField.tsx`
    (`background` + `backgroundSize/Position`, làm ảnh xem trước tranh nền chỉ hiện một góc). Sau khi sửa: 0 cảnh báo,
    ảnh xem trước hiện trọn.
  - Còn hai chỗ nhỏ chưa sửa: cảnh báo tranh nền hiện hai lần (ngay dưới thanh độ mờ và ở dải cảnh báo) khi đang ở
    tab Trang trí; danh sách theme lấy từ cache khi tải lại nên bản ghi thêm từ ngoài app (chỉ xảy ra khi test) chưa
    hiện ngay.
  - Vẫn chưa kiểm được: tải ảnh lên Supabase Storage thật và dọn ảnh mồ côi, bàn phím ảo, Back cứng, trình đọc màn
    hình, máy yếu.
