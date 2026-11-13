# Kế hoạch: Trải nghiệm trên điện thoại cho module Chi tiêu

> ## 🔁 BÀN GIAO CHO AI TIẾP THEO — ĐỌC TRƯỚC
>
> 1. Làm trên nhánh **`feat/ux-overhaul`** (`git switch feat/ux-overhaul`). Không làm trên `main`, không push.
> 2. Đây là kế hoạch **tiếp sau** `KE_HOACH_CAI_TIEN_UX.md` (Đợt A–D đã xong). Không đổi các
>    "Quyết định đã chốt" ở mục 0 của tài liệu đó.
> 3. **Chưa làm bước nào.** Trước khi bắt đầu, đọc mục 4 "Câu hỏi cho chủ repo": một số bước
>    (M1.2, M1.5, M2.1, Đợt M4) phụ thuộc câu trả lời hoặc kết quả thử trên máy thật.
> 4. Xong mỗi bước: `npm test && npm run typecheck && npm run lint && npm run build`, đánh dấu
>    `[x]` ở Checklist, ghi 1–3 dòng vào Nhật ký, `git commit` (một commit mỗi bước, message tiếng Anh).
> 5. Không sửa DB, không tạo migration trước Đợt M4 (và M4 cần chủ repo duyệt).

> Nguồn: rà code ngày 2026-11-13 trên `feat/ux-overhaul` (commit `979a817`), thử trên trang thử
> `harness.html` ở viewport 375×812, và tài liệu MDN / caniuse / WebKit / Chrome (link ở mục 2 và cuối file).
> Không đăng nhập được app thật (Google OAuth) và không có iPhone/Android thật: mọi điểm có ghi
> **"cần máy thật"** là suy ra từ code + tài liệu, chưa thấy tận mắt.

---

## 0. Tóm tắt vấn đề tìm được

**Cách đã kiểm:**
- **Đọc code**: dẫn file:dòng.
- **Harness 375×812**: `http://localhost:5173/harness.html` (cổng có thể khác), đo bằng `getBoundingClientRect`.
- **Mô phỏng bàn phím Android**: thu viewport còn 375×470. Với `interactive-widget=resizes-content`,
  Chrome Android thu nhỏ layout viewport giống hệt như vậy khi bàn phím mở.
- **Harness hiệu năng**: `harness/perf.html?n=500` (mới tạo, nằm trong `harness/` nên đã bị
  `.git/info/exclude` bỏ qua). Nó nạp N giao dịch giả trong tháng này.

| # | Vấn đề | Chỗ trong code | Mức | Đã kiểm bằng |
|---|---|---|---|---|
| P1 | **iOS: bàn phím che nút Lưu** trong bảng "Thêm giao dịch". iOS Safari bỏ qua `interactive-widget=resizes-content`, nên khi bàn phím mở `dvh` không đổi. Sheet vẫn cao `88dvh` tính từ đáy màn hình, và thanh nút `sticky bottom-0` nằm ngay dưới bàn phím | `index.html:10`, `SheetDialog.tsx:29`, `ExpenseEditForm.tsx:521` | **Cao** | Harness: nút Lưu ở y = 743–787 trên 812. Bàn phím số iOS kèm thanh "Xong" cao khoảng 300–350px, tức là che từ y ≈ 460 trở xuống. **Cần iPhone thật** để xác nhận |
| P2 | **Nút Back (Android) không đóng bảng.** Mọi sheet/drawer chỉ là state cục bộ, không có mục lịch sử. Bấm Back khi đang mở "Thêm giao dịch" thì tab phía sau đổi, còn bảng vẫn mở. Nếu đang ở mục lịch sử đầu tiên thì Back **thoát app** và mất số đang gõ ở chế độ nhập tay (bản nháp AI còn lại vì nằm trong sessionStorage) | `ExpensesPage.tsx:91-97` (state `addOpen`, `editTarget`, `sidebarOpen`, `monthPickerOpen`…), `SheetDialog.tsx:25` | **Cao** | Harness: mở sheet ở `?tab=report` rồi chạy `history.back()` → URL thành `?tab=transactions`, sheet **vẫn mở** |
| P3 | **Lưu khi mất mạng thì treo mà không báo gì.** Mutation để `networkMode` mặc định (`'online'`), nên khi offline TanStack Query **tạm dừng** mutation: `await mutateAsync` không bao giờ trả về và nút Lưu/Huỷ bị khoá vì `isPending`. Nếu người dùng đóng bảng rồi nhập lại, khi có mạng mutation cũ vẫn chạy tiếp, dễ thành **2 dòng**. Nếu đóng app thì mất giao dịch | `useExpenseMutations.ts:39-43` (cả các mutation khác cùng file), `ExpenseEditForm.tsx:216` | **Cao** | Đọc code + [TanStack Network Mode](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode). Chưa thử thật (harness không có Supabase) |
| P4 | **Service worker trả dữ liệu cũ mà không báo.** Supabase REST đi qua `NetworkFirst` với `networkTimeoutSeconds: 4`. Mạng chậm hơn 4 giây (4G yếu, thang máy) thì SW trả bản cache cũ, React Query coi đó là dữ liệu mới. Hệ quả: vừa thêm giao dịch, lần refetch trả về danh sách cũ, **dòng mới biến mất** tới lần tải sau, và dải "Đang ngoại tuyến" (A2) cũng không hiện. Lớp cache này trùng với cache React Query đã persist vào IndexedDB | `vite.config.ts:102-111`, `AppProviders.tsx:25-31` | Trung bình | Đọc code. Cần mạng chậm thật hoặc DevTools "Slow 3G" trên bản build để thấy |
| P5 | **Android: thanh dưới nổi lên trên bàn phím** khi gõ ô tìm kiếm. Với `resizes-content`, khung `100dvh` co lại, thanh dưới (57px + nút ＋ nhô lên) nằm ngay trên bàn phím. Ô tìm kiếm không dính nên cuộn kết quả xuống là mất luôn ô tìm | `AppShell.tsx:33,46,66`, `ExpenseBottomNav.tsx:51`, `ExpenseFilters.tsx:61` | Trung bình | Harness 375×470, đang focus ô tìm: thanh dưới ở y = 412–469, vùng cuộn chỉ còn 348px (khoảng 2 dòng giao dịch dưới phần đầu trang) |
| P6 | **Danh sách dài vẽ lại toàn bộ.** Tab Giao dịch vẽ mọi dòng của tháng. `ExpenseRow` không `memo`, `ExpenseDayGroup` tạo closure mới cho mỗi dòng, và mỗi phím gõ ở ô tìm lọc rồi vẽ lại cả danh sách | `ExpenseList.tsx:122-150`, `ExpenseDayGroup.tsx:119-126`, `ExpenseRow.tsx:24`, `ExpensesPage.tsx:126-129` | Trung bình | Harness `perf.html?n=500` (dev mode, StrictMode, CPU máy tính): 5.403 node DOM. Mở tab Giao dịch ≈ **344 ms** tới lần ghi DOM cuối, xoá ô tìm (vẽ lại 500 dòng) ≈ **318 ms**, gõ 1 ký tự (còn ít dòng) ≈ 67 ms. Bản build nhanh hơn dev, nhưng điện thoại Android tầm trung chậm hơn máy tính 4–6 lần. **Cần đo bằng bản build trên máy thật** |
| P7 | **Mở app từ màn hình chính luôn vào Lịch tuần.** `start_url: '/'` và app không nhớ module dùng gần nhất, nên người dùng Chi tiêu hằng ngày phải chạm thêm 1–2 lần mỗi lần mở | `vite.config.ts:84`, `index.html:23`, `ModuleNav.tsx:14` | Trung bình | Đọc code |
| P8 | **Không kiểm tra bản mới khi app chỉ được mở lại từ nền.** `useRegisterSW()` không có hẹn giờ `registration.update()`. PWA trên điện thoại hiếm khi khởi động lại hẳn, nên có thể chạy bản cũ nhiều ngày mà không hiện toast "Có bản mới" | `PwaUpdatePrompt.tsx:12` | Thấp–TB | Đọc code + [vite-plugin-pwa: periodic SW updates](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates.html) |
| P9 | **Nội dung lọt xuống dưới thanh nút Lưu.** Sheet có `padding-bottom` (20px + safe-area) **bên dưới** thanh `sticky bottom-0`, nên phần nội dung cuộn hiện qua dải đó: hàng chip "Hôm nay / Hôm qua" thò ra dưới nút Lưu. Trên iPhone có thanh home, dải này cao khoảng 54px | `SheetDialog.tsx:29` (`max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))]`), `ExpenseEditForm.tsx:521` | Thấp | Harness: chụp màn hình thấy hàng chip Ngày dưới thanh nút |
| P10 | **Cuộn lồng nhau trong sheet** không có `overscroll-behavior: contain`. Trên Android không hại gì vì `body` đã `overflow: hidden` (base-ui khoá cuộn). Trên iOS, sheet có thể "nảy" cả khối khi kéo quá đầu/cuối | `SheetDialog.tsx:29` | Thấp | Harness: `overscrollBehavior = auto`, `scrollHeight 893 > clientHeight 713` (form nhập tay phải cuộn mới thấy mục Ngày). Hiện tượng nảy **cần iPhone** |
| P11 | **iOS có thể không bật bàn phím khi tự focus ô tiền.** iOS chỉ mở bàn phím khi `focus()` chạy trong chính thao tác chạm. Ở đây sheet mở qua portal và animation rồi mới `autoFocus`, nên có thể chỉ thấy con trỏ mà không có bàn phím. Khi đó phải chạm thêm một lần, mất mục tiêu "4 chạm" của D1 | `ExpenseEditForm.tsx:334`, `AddTransactionSheet.tsx:65` | TB (chưa chắc) | **Cần iPhone thật.** Trên harness desktop thì focus chạy đúng (`activeElement = amount`) |
| P12 | **Xoá khi offline**: lệnh xoá gọi API trực tiếp sau 5 giây; offline thì toast lỗi chung chung và dòng hiện lại | `useUndoableActions.ts:60-66` | Thấp | Đọc code |
| P13 | **Tai thỏ khi xoay ngang**: đỉnh (header, toast, sidebar) và đáy (thanh dưới, sheet) đã xử lý safe-area. Chưa xử lý `safe-area-inset-left/right`, nhưng ở chiều ngang (≥ 640px) AppShell có lề 26px nên chỉ bị che một ít | `AppShell.tsx:33` | Thấp | Đọc code. Hiếm khi dùng app chiều ngang |

**Những gì đã ổn (không cần làm lại):** `viewport-fit=cover` + safe-area ở header, thanh dưới,
sheet và toast. Ô nhập trên mobile ≥ 16px (`index.css:157-163`, không bị iOS tự zoom). `theme-color`
đổi theo theme (`ThemeContext.tsx:232-246`). Nút cao 44px (B4). Trên Android (mô phỏng 375×470),
bảng nhập tay vẫn thấy ô tiền (y 281–337) và nút Lưu (y 401–445) khi bàn phím mở.

**Chưa kiểm được vì cần máy thật:** P1, P10 (nảy), P11, cử chỉ vuốt Back trên iOS khi chạy dạng PWA,
kéo-để-tải-lại mặc định của Android khi chạy dạng PWA, nhận diện giọng nói (`useSpeechRecognition`)
trong PWA iOS, số đo hiệu năng P6 trên điện thoại thật, hành vi offline/cập nhật bản mới trên bản build đã cài.

---

## 1. Nguyên tắc

| Nguyên tắc | Cụ thể |
|---|---|
| Sửa cái đang hỏng trước tính năng mới | Đợt M1 chỉ sửa lỗi: Back, bàn phím, offline |
| Không bao giờ nói sai (giữ từ kế hoạch UX) | Đang lưu ≠ đã lưu; dữ liệu cũ phải được biết là cũ |
| Tính năng chỉ có trên một nền tảng thì phải tự ẩn ở nơi không hỗ trợ | Phát hiện bằng feature detection, không đoán theo user agent |
| Mỗi bước kiểm được trên harness; phần cần máy thật ghi rõ để chủ repo thử | Tiêu chí xong tách "harness" và "máy thật" |

---

## 2. Bảng khả thi các ý được đề xuất

| Ý | iOS (Safari, PWA màn hình chính) | Android (Chrome, PWA đã cài) | Công sức | Rủi ro | Khuyến nghị |
|---|---|---|---|---|---|
| **Lối tắt khi nhấn giữ icon** (`shortcuts` trong manifest) mở thẳng form thêm | ❌ Không hỗ trợ ([caniuse](https://caniuse.com/mdn-manifests_webapp_shortcuts), [web-features](https://web-platform-dx.github.io/web-features-explorer/features/app-shortcuts)) | ✅ Có, khi đã cài | **S** | Phải xử lý `/expenses?add=1` (mở sheet rồi xoá tham số bằng `replace`). Android chỉ cập nhật lối tắt khi WebAPK cập nhật manifest, có thể trễ vài ngày. Cần icon 96×96 | **Làm** (M3.1) |
| **Vuốt hàng sang trái để xoá** (có Hoàn tác) | ✅ JS thuần (pointer events) | ✅ | **M** | Đụng cuộn dọc (cần khoá hướng + `touch-action: pan-y`). Đụng cử chỉ vuốt Back ở mép trái trên iOS. Hàng đang là một nút phủ toàn bộ (`ExpenseRow.tsx:50-56`) nên phải tách chạm và vuốt. Người dùng có thể xoá nhầm, nhưng đã có Hoàn tác 5 giây | Làm **sau M1**, chỉ vuốt sang trái, có nút "Xoá" lộ ra (không xoá ngay khi vuốt hết) |
| **Kéo xuống để tải lại** | ❌ Không có sẵn ở chế độ PWA, phải tự viết | Có sẵn khi chạy trong trình duyệt ([Chrome: overscroll-behavior](https://developer.chrome.com/blog/overscroll-behavior)). Khi chạy dạng PWA cài đặt và vùng cuộn là một `div` bên trong thì **chưa chắc**, cần máy thật | **M** | Đụng cuộn và hiệu ứng nảy của iOS. Lợi ích nhỏ vì React Query đã tự tải lại khi app quay lại từ nền (`refetchOnWindowFocus` mặc định, `staleTime` 30 giây) | **Không làm.** Thay bằng dòng nhỏ "Cập nhật lúc HH:mm · Làm mới" (S, M3.5) |
| **Rung nhẹ khi lưu** (`navigator.vibrate`) | ❌ Không hỗ trợ, gọi thì trả `false` và không báo lỗi ([caniuse](https://caniuse.com/mdn-api_navigator_vibrate)). Có mẹo không chính thức dùng `<input type="checkbox" switch>` trên iOS 18+, **không khuyến nghị** | ✅ | **S** | Gây khó chịu nếu rung nhiều: chỉ rung khi lưu thành công và khi Đã trả. Lịch tuần đã dùng sẵn (`useTaskDragResize.ts:271`) | **Làm** (M3.2), dùng `navigator.vibrate?.(…)` |
| **Chia sẻ tin báo ngân hàng vào app** (Web Share Target) | ❌ Không hỗ trợ | ✅ Chỉ khi đã cài PWA ([MDN share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target), [Chrome docs](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)) | **M** | Tin báo ngân hàng là dữ liệu nhạy cảm: dùng `GET` thì nội dung nằm trên URL, có thể vào log Netlify nếu SW chưa kiểm soát trang. Nên dùng `POST` + SW tự xử lý (phải chuyển sang `injectManifest`), hoặc `GET` rồi `replaceState` xoá ngay và chấp nhận rủi ro log. AI cần phân biệt số tiền giao dịch với "SD" (số dư). Nhiều ngân hàng VN đã chuyển từ SMS sang thông báo trong app, mà thông báo thì không chia sẻ được | Làm **sau khi chủ repo xác nhận** họ thật sự nhận SMS (câu hỏi Q8) |
| **Nhắc ghi chép buổi tối** (Web Push) | ✅ Chỉ iOS/iPadOS **16.4+**, chỉ khi **đã thêm vào màn hình chính**, và chỉ xin quyền được **khi người dùng chạm nút** ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)) | ✅ | **L** | Cần: (1) khoá VAPID (biến môi trường bí mật); (2) bảng `push_subscriptions` + RLS (**migration**); (3) SW có handler `push`/`notificationclick`, tức phải chuyển `vite-plugin-pwa` sang [`injectManifest`](https://vite-pwa-org.netlify.app/guide/inject-manifest.html) hoặc `importScripts`; (4) bộ gửi theo lịch: [Supabase Cron + Edge Function](https://supabase.com/docs/guides/cron) hoặc [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/), chạy 15 phút/lần, chọn người đến giờ nhắc theo múi giờ của họ và hôm nay chưa ghi gì; (5) dọn subscription hết hạn (HTTP 404/410); (6) UI bật/tắt + chọn giờ. iOS mất subscription khi gỡ app. Phải cho phép endpoint `*.push.apple.com` | Đợt riêng (M4), **cần chủ repo duyệt migration** |

Ghi chú về `interactive-widget`: Chrome Android hỗ trợ ([Chrome blog](https://developer.chrome.com/blog/viewport-resize-behavior)),
iOS Safari **không** hỗ trợ ([caniuse](https://caniuse.com/mdn-html_elements_meta_name_viewport_interactive-widget_resizes-content),
[WebKit bug 259770](https://bugs.webkit.org/show_bug.cgi?id=259770)). Trên iOS chỉ có
[`visualViewport`](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) để biết bàn phím đang chiếm bao nhiêu.

---

## 3. Kế hoạch chia đợt

Thứ tự: dễ mà lợi nhiều trước. Đợt M1 sửa lỗi, M2 tăng tốc, M3 thêm tính năng nhỏ, M4 tính năng cần server.

### Đợt M1 — Sửa lỗi trên điện thoại (không thêm tính năng)

#### M1.1 Nút Back đóng lớp trên cùng ⭐

**Việc cần làm:**
- Tạo `src/hooks/useBackToClose.ts(open, onClose)`. Khi `open` chuyển sang `true`, `history.pushState`
  một mục có đánh dấu (`{ ...history.state, sheet: id }`, URL giữ nguyên). Gặp `popstate` thì gọi `onClose()`.
  Khi đóng bằng nút (Huỷ, chạm nền, Lưu) mà mục đánh dấu vẫn đang ở đầu thì `history.back()`
  để không để lại mục thừa.
- Dùng trong `SheetDialog.tsx` (là đủ cho Thêm, Sửa, MonthPicker nếu dùng SheetDialog),
  `ExpenseCategoryManagerModal.tsx`, `AmountVisibilityDialog.tsx`, `LedgerSettingsDialog.tsx`,
  drawer `Sidebar` trên mobile (`ExpensesPage.tsx:91`), và `ConfirmDialog` (lồng trên sheet).

**Tiêu chí xong (harness):**
- Mở sheet rồi `history.back()` → sheet đóng, `location.search` **không đổi**.
- Mở rồi đóng bằng Huỷ 5 lần → `history.length` không tăng.
- Mở Sửa → Xoá danh mục (ConfirmDialog) → Back → chỉ hộp xác nhận đóng.
- Đổi tab bằng thanh dưới vẫn tạo mục Back như C1.

**Tiêu chí xong (máy thật, Android):** nút Back cứng / cử chỉ Back đóng sheet, không thoát app.

**Rủi ro:** `pushState` trực tiếp đi vòng qua React Router: phải giữ `history.state` của router (`usr`, `key`),
nếu không router sẽ coi đó là trang mới. StrictMode chạy effect hai lần nên phải chống push hai lần.
Đóng sheet bằng Lưu xong rồi `setView` trong cùng lượt có thể chạy đua với `history.back()`.

#### M1.2 Bảng dưới: khung cố định + tránh bàn phím iOS ⭐

**Việc cần làm:**
- `SheetDialog.tsx`: đổi thành cột flex. Tiêu đề ở trên, **thân cuộn** (`overflow-y-auto overscroll-contain`) ở giữa.
  Bỏ `pb` safe-area khỏi khung ngoài và chuyển vào thanh nút. Như vậy sửa luôn P9 và P10.
- `ExpenseEditForm.tsx:521`: thanh nút giữ `sticky bottom-0` nhưng tự chịu `pb-[env(safe-area-inset-bottom)]`.
  Cách gọn hơn: cho SheetDialog nhận prop `footer`.
- Tạo `src/hooks/useVisualViewport.ts` trả `{ height, offsetTop, keyboardInset }`
  (`keyboardInset = innerHeight − vv.height − vv.offsetTop`, chỉ khác 0 trên iOS vì Android đã tự co layout).
  SheetDialog đặt `max-height: min(88dvh, vv.height − 12px)` và `bottom: keyboardInset`.
- Khi ô đang focus bị che thì `scrollIntoView({ block: 'nearest' })` trong thân cuộn.

**Tiêu chí xong (harness):** ở 375×812, chụp màn hình không còn chữ nào lộ dưới thanh nút.
Ở 375×470 (mô phỏng Android), nút Lưu vẫn nằm trong vùng thấy được và ô tiền vẫn thấy.
Gán giả `keyboardInset = 320` bằng tham số debug → nút Lưu nằm ngay trên vùng 320px.

**Tiêu chí xong (máy thật, iPhone):** mở ＋ → Nhập tay, gõ số → **thấy nút Lưu ngay trên bàn phím**,
bấm được mà không phải đóng bàn phím. Mở "Sửa" một dòng, gõ Ghi chú (ô ở dưới) → ô ghi chú và nút Lưu đều thấy.

**Rủi ro:** **Cao.** Hành vi `visualViewport` của iOS có nhiều chỗ lạ: trang bị cuộn ngầm khi focus,
`offsetTop` nhảy, sự kiện `resize` đến trễ khi animation bàn phím. Phải thử trên iPhone thật mới
coi là xong; không làm được thì phương án dự phòng là đưa nút Lưu lên **đầu** sheet, cạnh tiêu đề,
trên iOS. Không ảnh hưởng desktop vì chỉ áp dưới `sm`.

#### M1.3 Ẩn thanh dưới khi bàn phím mở

**Việc cần làm:** hook `useKeyboardOpen()` (đặt cùng file với M1.2). Bàn phím coi là mở khi có
`focusin` vào `input/textarea` (trừ checkbox/radio/date) **và** (`vv.height < innerHeight * 0.8`
hoặc `innerHeight` vừa giảm > 150px). `ExpenseBottomNav.tsx` trả `null`, hoặc `hidden`, khi bàn phím mở.
Cân nhắc cho ô tìm kiếm + tab lọc (`ExpenseFilters`) dính (`sticky top-0`) trong vùng cuộn.

**Tiêu chí xong (harness 375×470):** focus ô tìm → thanh dưới `display: none`, vùng cuộn ≥ 405px.
Blur → thanh dưới hiện lại. Ở 375×812 không focus thì không đổi gì.

**Rủi ro:** thấp. Đoán sai (bàn phím vật lý, iPad) thì thanh dưới chỉ ẩn trong lúc đang gõ.

#### M1.4 Lưu khi mất mạng: báo ngay, giữ form ⭐

**Việc cần làm:**
- `useExpenseMutations.ts`: đặt `networkMode: 'always'` cho các mutation ghi. Như vậy offline thì lỗi
  mạng trả về ngay thay vì bị tạm dừng vô thời hạn.
- `src/lib/utils/errorMessage.ts` + 4 file i18n: nhận ra lỗi mạng (`TypeError: Failed to fetch`,
  hoặc `!navigator.onLine`) → "Không có mạng — giao dịch **chưa được lưu**. Thử lại khi có mạng."
- `ExpenseEditForm` / `ParsedDraftList`: khi lỗi thì giữ nguyên dữ liệu đã nhập (hiện đã giữ vì `catch` không reset).
- Không làm hàng đợi offline ở bước này: cần id tạo phía client để chống trùng. Nếu chủ repo muốn thì để Đợt E.

**Tiêu chí xong:** dùng bản build + đăng nhập thật (chủ repo), hoặc harness có mock `fetch` trả lỗi mạng.
Bật Offline → bấm Lưu → trong ≤ 2 giây có toast "chưa được lưu", số tiền còn trong ô, nút bấm lại được.
Bật Online → Lưu → DB có **đúng 1** dòng.

**Rủi ro:** thấp. Lưu ý `navigator.onLine` trên iOS đôi khi báo sai, nên dựa vào lỗi thật của `fetch`, không chỉ cờ này.

#### M1.5 Bỏ cache Supabase REST trong service worker

**Việc cần làm:** `vite.config.ts:102-111` xoá rule `supabase-rest` (hoặc đổi sang `NetworkOnly`).
Dữ liệu xem offline đã có cache React Query persist trong IndexedDB (`AppProviders.tsx:25-31`, giữ 7 ngày,
bằng với SW). Thêm một lần dọn `caches.delete('supabase-rest')` khi app khởi động,
vì Workbox không tự xoá cache runtime cũ.

**Tiêu chí xong:** `npm run build && npm run preview`, DevTools → Application → Cache Storage không còn
`supabase-rest`. Offline vẫn thấy tháng đã xem (dải "Đang ngoại tuyến · dữ liệu lúc HH:mm" hiện đúng).
Throttle "Slow 3G" → thêm giao dịch → dòng mới không biến mất.

**Rủi ro:** tháng chưa từng mở bằng React Query nhưng có trong SW cache sẽ không xem được offline nữa.
Chấp nhận được; hỏi chủ repo (Q6).

#### M1.6 Kiểm tra bản mới khi app quay lại từ nền

**Việc cần làm:** `PwaUpdatePrompt.tsx` dùng `useRegisterSW({ onRegisteredSW(url, r) { … } })`.
Khi `visibilitychange` → `visible` và đã quá 1 giờ kể từ lần kiểm trước thì gọi `r.update()`.

**Tiêu chí xong:** deploy bản A, mở PWA, đưa xuống nền. Deploy bản B. Mở lại app sau hơn 1 giờ
(hoặc hạ ngưỡng còn 1 phút để thử) → toast "Có bản mới" hiện ra mà không phải tắt hẳn app.

**Rủi ro:** thấp. Bấm "Tải lại" khi đang có lệnh xoá chờ Hoàn tác: `pagehide` đã xả lệnh (`useUndoableActions.ts:24`), nên không mất.

### Đợt M2 — Mở nhanh, cuộn mượt

#### M2.1 Mở app vào thẳng Chi tiêu

**Việc cần làm:** `ModuleNav.tsx` ghi module vừa chọn vào `localStorage` (`weeklyScheduler.lastModule`).
Ở `/`, **chỉ lần điều hướng đầu tiên** của phiên và chỉ khi `matchMedia('(display-mode: standalone)')`,
nếu module cuối là Chi tiêu thì `navigate('/expenses', { replace: true })`.
Không đổi `start_url` vì iOS chỉ đọc manifest lúc cài, đổi thì phải cài lại.

**Tiêu chí xong:** harness có giả `display-mode` (hoặc dùng cờ debug): mở Chi tiêu → tải lại `/` → vào `/expenses`.
Chọn Lịch tuần → tải lại → ở `/`. Chạy trong tab trình duyệt thường thì không chuyển hướng.

**Rủi ro:** người dùng muốn vào Lịch tuần lại bị đưa sang Chi tiêu; vì nhớ đúng module cuối nên ít gặp.
Chờ câu trả lời Q7.

#### M2.2 Danh sách dài

**Việc cần làm:**
1. **Đo trước.** Chạy `harness/perf.html?n=500` trong Chrome DevTools với CPU throttle 6×, tab Performance
   + React Profiler. Ghi thời gian chuyển tab và INP khi gõ tìm.
2. `ExpenseRow` bọc `React.memo`. `ExpenseDayGroup.tsx:124-125` truyền `expense` + callback ổn định thay vì
   tạo closure mới mỗi lần.
3. `ExpensesPage.tsx:126-129`: lọc theo `useDeferredValue(filter)` để ô tìm không bị khựng.
4. `ExpenseDayGroup` (`<section>`): `content-visibility: auto; contain-intrinsic-size: auto 300px`
   để trình duyệt bỏ qua phần ngoài màn hình (Chrome 85+, Safari 18+, nơi khác bị bỏ qua vô hại).
5. Chỉ dùng thư viện ảo hoá (`@tanstack/react-virtual`) nếu sau bước 2–4 vẫn chưa đạt, vì nó vướng nhóm
   `details` "Sắp tới" và tiêu đề ngày.

**Tiêu chí xong:** throttle 6×, n=500: chuyển sang tab Giao dịch < 200 ms, mỗi phím gõ tìm < 50 ms (không có long task > 50 ms).
Test cũ vẫn đạt. Kết quả lọc giống hệt trước.

**Rủi ro:** `content-visibility` làm thanh cuộn "nhảy" khi kích thước ước lượng sai, và có thể ảnh hưởng
Ctrl+F trên desktop. Kiểm trên Safari iOS.

### Đợt M3 — Tính năng nhỏ cho điện thoại

#### M3.1 Lối tắt "Thêm giao dịch" khi nhấn giữ icon (Android)

**Việc cần làm:** `vite.config.ts` manifest thêm
`shortcuts: [{ name: 'Thêm giao dịch', short_name: 'Thêm', url: '/expenses?add=1', icons: [{ src: '/icons/shortcut-add-96.png', sizes: '96x96' }] }]`.
`useExpensesUrlState.ts` đọc `add=1` → `ExpensesPage` mở `AddTransactionSheet` rồi xoá tham số (`replace`).
Sổ chỉ xem thì bỏ qua. Cần thêm icon `public/icons/shortcut-add-96.png`.

**Tiêu chí xong (harness):** mở `/harness.html?add=1` → sheet mở, URL không còn `add`. Back không mở lại sheet.
**Máy thật (Android):** nhấn giữ icon thấy "Thêm giao dịch", chạm vào → app mở thẳng form.

**Rủi ro:** thấp. Android có thể mất vài ngày mới cập nhật manifest cho app đã cài; gỡ rồi cài lại thì thấy ngay.

#### M3.2 Rung nhẹ khi lưu (Android)

**Việc cần làm:** `src/lib/utils/haptic.ts`: `haptic = () => navigator.vibrate?.(12)`.
Gọi trong `announceCreated` và `markPaidWithUndo` khi thành công (`useUndoableActions.ts`). Không rung khi lỗi.

**Tiêu chí xong:** harness có mock `navigator.vibrate` đếm số lần gọi: lưu 1 khoản → gọi 1 lần.
iOS không lỗi gì (hàm không tồn tại). **Máy thật Android:** cảm nhận được rung.

**Rủi ro:** thấp. Cân nhắc nút tắt trong tab Thêm (Q10).

#### M3.3 Nhận tin báo ngân hàng qua "Chia sẻ" (Android) — chờ Q8

**Việc cần làm:** manifest thêm
`share_target: { action: '/expenses', method: 'GET', params: { title: 'share_title', text: 'share_text' } }`.
`ExpensesPage` thấy `share_text` thì: `replaceState` xoá ngay khỏi URL → mở sheet ở chế độ AI, câu đã điền sẵn
(dùng lại `initialText` của `QuickAddSheet`), **không tự gửi AI**, để người dùng bấm. Cập nhật prompt AI
(`netlify/functions/parse-expense.js`) cho mẫu tin "TK … −50,000VND … SD …": lấy số tiền giao dịch, bỏ số dư.

**Tiêu chí xong:** harness `/harness.html?share_text=...` → sheet AI có sẵn câu, URL sạch.
**Máy thật Android:** chia sẻ một SMS từ app Tin nhắn → chọn app → thấy câu trong ô AI. Gửi → bản nháp đúng
số tiền, không lấy nhầm số dư.

**Rủi ro:** trung bình. Nội dung SMS có thể vào log máy chủ ở lần mở đầu (trước khi SW kiểm soát).
Nếu chủ repo lo điều này thì dùng `POST` + SW, và phải chuyển sang `injectManifest`, nên công sức lên L.

#### M3.4 Vuốt sang trái để xoá

**Việc cần làm:** hook `useSwipeAction` (pointer events, khoá hướng sau 10px, `touch-action: pan-y` trên hàng).
Vuốt hơn 72px thì để lộ nút "Xoá" đỏ 72px; chạm nút thì gọi `deleteWithUndo`. Chạm hàng khác hoặc cuộn thì đóng.
Chỉ áp trên thiết bị cảm ứng (`useIsTouchDevice`). File: `ExpenseRow.tsx`, hook mới trong `features/expenses/hooks/`.

**Tiêu chí xong:** harness giả lập pointer: kéo −100px → hiện nút Xoá; kéo dọc 100px → danh sách cuộn,
nút không hiện; chạm (không kéo) → mở form sửa như cũ. Xoá → toast Hoàn tác.
**Máy thật:** iPhone và Android, không xoá nhầm khi cuộn nhanh.

**Rủi ro:** trung bình (đụng cử chỉ). Làm sau M1.1 để biết hành vi Back và vuốt mép trên iOS (Q4).

#### M3.5 "Cập nhật lúc … · Làm mới" thay cho kéo-để-tải-lại

**Việc cần làm:** dưới thẻ chính của Tổng quan (`OverviewTab.tsx`): chữ nhỏ "Cập nhật lúc HH:mm"
lấy từ `dataUpdatedAt`, kèm nút chữ "Làm mới" (`refetch`, cao 44px). Dùng lại chỗ hiển thị của dải ngoại tuyến (A2) nếu được.

**Tiêu chí xong:** harness: bấm Làm mới → giờ đổi. Đang tải thì nút bị khoá và có `aria-busy`.

**Rủi ro:** thấp.

### Đợt M4 — Nhắc ghi chép buổi tối (Web Push) — cần duyệt riêng

Lập kế hoạch chi tiết riêng sau khi chủ repo trả lời Q9. Khung công việc:

1. **Migration:** bảng `push_subscriptions(user_id, endpoint, p256dh, auth, tz, remind_at, created_at)` + RLS chỉ chủ sở hữu.
2. **SW:** chuyển `vite-plugin-pwa` sang `injectManifest` (`src/sw.ts`): precache như cũ, thêm `push` → `showNotification`,
   `notificationclick` → mở `/expenses?add=1`.
3. **Client:** tab Thêm có mục "Nhắc ghi chép" (bật/tắt + giờ). Bật thì phải từ **cú chạm** →
   `Notification.requestPermission()` → `pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })` → lưu DB.
   Trên iOS mà chưa cài lên màn hình chính thì hiện hướng dẫn cài (đã có `IosInstallBanner`).
4. **Gửi:** Supabase Edge Function + `pg_cron` mỗi 15 phút, hoặc Netlify Scheduled Function. Chọn người có `remind_at`
   rơi vào khung giờ theo `tz` **và** hôm nay chưa có giao dịch nào → gửi bằng `web-push` (khoá VAPID riêng ở env).
   Lỗi 404/410 thì xoá subscription.

**Tiêu chí xong:** Android và iPhone (iOS ≥ 16.4, đã cài) nhận thông báo đúng giờ địa phương. Hôm đã ghi
thì không nhận. Chạm thông báo → mở form thêm. Tắt trong app → không nhận nữa.

**Rủi ro:** cao nhất trong kế hoạch: thêm server, khoá bí mật, migration, và đổi chiến lược SW (precache có thể hỏng
nếu cấu hình sai, khiến app không mở được offline). Thông báo phiền thì người dùng tắt luôn quyền.

---

## 4. Câu hỏi cho chủ repo (trả lời / thử trên máy thật trước khi làm)

| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| Q1 | Bạn dùng máy gì (đời iPhone + bản iOS, đời Android)? Chủ yếu mở bằng PWA đã cài hay trong trình duyệt? | Mọi đợt |
| Q2 | **Trên iPhone:** chạm ＋ → Nhập tay. Bàn phím số có **tự bật** không? Bàn phím có **che nút Lưu** không? (gửi ảnh chụp) | P1, P11, M1.2 |
| Q3 | **Trên Android, app đã cài:** kéo mạnh từ đầu danh sách xuống có tải lại trang không? | M3.5, có làm kéo-để-tải-lại không |
| Q4 | **Trên iPhone, app đã cài:** vuốt từ mép trái sang có quay lại trang/tab trước không? | M1.1, M3.4 |
| Q5 | Mất mạng thì "báo lỗi, giữ form" (M1.4) là đủ, hay cần **hàng đợi offline** tự gửi lại khi có mạng (công sức L, cần đổi cách tạo id)? | M1.4, Đợt E |
| Q6 | Đồng ý bỏ cache Supabase trong service worker (chỉ giữ cache IndexedDB của React Query)? | M1.5 |
| Q7 | Mở app từ màn hình chính: luôn vào Chi tiêu, hay **nhớ module dùng gần nhất**? | M2.1 |
| Q8 | Ngân hàng của bạn báo biến động bằng **SMS** hay thông báo trong app? Bạn có thật sự muốn chia sẻ tin đó vào app? Có lo nội dung SMS nằm trong log máy chủ không? | M3.3 |
| Q9 | Nhắc buổi tối: giờ cố định (ví dụ 21:00) hay tự chọn? Chỉ nhắc khi hôm đó chưa ghi gì? **Đồng ý tạo migration + Edge Function/pg_cron (hoặc Netlify Scheduled Function) và khoá VAPID?** | Đợt M4 |
| Q10 | Rung khi lưu: bật mặc định? Có cần nút tắt? | M3.2 |
| Q11 | Một tháng bạn thực tế có khoảng bao nhiêu giao dịch? (Để biết P6 có đáng làm sớm.) | M2.2 |
| Q12 | **Trên iPhone, app đã cài:** nút micro ở ô AI có hoạt động không? | Có thể thêm việc |

---

## Rủi ro chung và cách xử lý

| Rủi ro | Xử lý |
|---|---|
| Không có máy thật để kiểm phần iOS | Mỗi bước có tiêu chí "harness" (AI tự kiểm) và "máy thật" (chủ repo kiểm). Chưa qua máy thật thì ghi "chưa xác nhận" trong Nhật ký, không đánh `[x]` cho M1.2 |
| `history.pushState` (M1.1) đụng React Router | Giữ nguyên `history.state` của router, thêm cờ riêng. Kiểm lại toàn bộ tiêu chí C1 (Back giữa các tab) |
| Đổi SW (M1.5, M4) làm hỏng chế độ offline / cập nhật | Thử `npm run build && npm run preview` + DevTools Offline trước khi commit. M4 làm trên nhánh riêng |
| Tính năng chỉ có trên Android làm người dùng iOS thấy thiếu | Chỉ thêm, không đổi luồng chính. Phát hiện tính năng, không đoán theo user agent |
| Lịch tuần bị ảnh hưởng (`AppShell`, `SheetDialog` dùng chung kiểu) | M1.1–M1.3 chỉ áp cho module Chi tiêu trước. Kiểm lại `/harness.html?scheduler` |

---

## Checklist tổng

- [x] **M1.1** Back đóng sheet/drawer/hộp xác nhận (`useBackToClose`)
- [ ] **M1.2** SheetDialog khung cố định + `visualViewport` cho iOS (cần iPhone để chốt) — *phần harness đã làm, **chưa xác nhận trên iPhone***
- [x] **M1.3** Ẩn thanh dưới khi bàn phím mở
- [x] **M1.4** Lưu offline báo ngay, giữ form (`networkMode: 'always'` + thông điệp)
- [ ] **M1.5** Bỏ cache Supabase REST trong SW (chờ Q6)
- [x] **M1.6** Kiểm tra bản mới khi app quay lại từ nền
- [ ] **M2.1** Mở app vào thẳng Chi tiêu (chờ Q7)
- [ ] **M2.2** Danh sách dài: đo → `memo` → `useDeferredValue` → `content-visibility` — *bước 1–4 đã làm; tiêu chí chuyển tab < 200 ms ở throttle 6× **ước tính chưa đạt**, xem Nhật ký*
- [x] **M3.1** Manifest `shortcuts` + `?add=1`
- [x] **M3.2** Rung nhẹ khi lưu (Android)
- [ ] **M3.3** Web Share Target cho SMS ngân hàng (chờ Q8)
- [ ] **M3.4** Vuốt trái để xoá
- [x] **M3.5** "Cập nhật lúc … · Làm mới"
- [ ] **M4** Nhắc buổi tối bằng Web Push (kế hoạch riêng, chờ Q9)
- [ ] Sau mỗi đợt: chủ repo thử trên iPhone + Android thật, cả PWA đã cài lẫn trình duyệt

---

## Nhật ký tiến độ

> Ghi mới nhất ở dưới cùng.

- 2026-11-13 — Lập kế hoạch (chỉ điều tra, chưa sửa code). Đã đo trên harness: nút Lưu ở y 743–787/812 (P1),
  Back không đóng sheet (P2), thanh dưới chiếm 57px trên bàn phím khi viewport 375×470 (P5),
  500 giao dịch: 5.403 node DOM, mở tab Giao dịch ≈ 344 ms ở dev (P6), nội dung lộ dưới thanh nút (P9).
  Tạo `harness/perf.html` + `harness/perf.tsx` (bị exclude, không commit) để đo danh sách dài: `?n=500`.
- 2026-11-13 — **M1.1 xong (harness).** `src/hooks/useBackToClose.ts` + `src/lib/utils/historyLayer.ts` (có test). Gắn vào SheetDialog,
  AmountVisibility/CategoryManager/LedgerSettings, ConfirmDialog, drawer mobile. Harness 375×812: mở ＋ ở `?tab=report` → `history.back()` → sheet đóng,
  URL vẫn `?tab=report`; Sửa → Hủy 5 lần không để lại mục thừa (state về `{usr,key,idx}`); Danh mục → Xoá → Back → chỉ hộp xác nhận đóng (độ sâu 2→1);
  đổi tab rồi Back vẫn về tab trước (C1); chọn tháng trong MonthPicker không để lại mục (đổi URL đợi `popstate` — `whenHistorySettles`). Cần chủ repo thử Back cứng/cử chỉ trên Android.
- 2026-11-13 — **M1.3 xong (harness).** `useKeyboardOpen()` trong `src/hooks/useVisualViewport.ts`, hàm thuần `src/lib/utils/viewport.ts` (có test).
  `harness.html?tab=transactions`: 812 + focus ô tìm → thanh dưới vẫn `flex`; thu còn 375×470 → `display: none`, vùng cuộn 348 → **405px**; blur → `flex`.
  Pane trình duyệt bị ẩn nên `resize`/`focusin`/`focusout` phải bắn tay (trang không có focus hệ thống). Cần chủ repo thử gõ ô tìm trên Android + iPhone.
- 2026-11-13 — **M1.4 xong (harness).** `networkMode: 'always'` cho mọi mutation trong `useExpenseMutations.ts`; `isNetworkError()` (có test) +
  `errNetworkNotSaved` đủ vi/en/ja/zh, dùng ở ExpenseEditForm + ParsedDraftList. Harness: giả offline (`fetch` reject `TypeError`, `navigator.onLine=false`,
  bắn sự kiện `offline`) → Nhập tay 45.000 → Lưu → toast "…chưa được lưu…" sau **62 ms**, ô tiền vẫn `45.000`, nút Lưu bấm được. Harness không có user nên lỗi
  đến từ `mutationFn` chứ không phải `fetch` thật. Cần chủ repo: bản build + đăng nhập, DevTools Offline → Lưu → bật mạng → Lưu → DB đúng 1 dòng.
- 2026-11-13 — **M1.6 xong (bản build).** `PwaUpdatePrompt` giữ `registration` từ `onRegisteredSW`; `visibilitychange → visible` + quá 1 giờ
  (`shouldCheckForUpdate`, có test) + online → `registration.update()`. `vite preview` (cổng 4173, có SW): giả `Date.now` +61 phút → `update()` gọi **1** lần;
  quay lại ngay sau đó → không gọi thêm; chưa tới 1 giờ → 0 lần. Cần chủ repo: deploy A, mở PWA, để nền; deploy B; mở lại sau > 1 giờ → thấy toast "Có bản mới".
- 2026-11-13 — **M1.2 làm phần harness, CHƯA xác nhận trên iPhone (chưa đánh [x]).** SheetDialog thành cột flex: tiêu đề + thân cuộn `.sheet-body`
  (`overscroll-contain`); thanh nút form có `data-sheet-footer` tự chịu đáy + safe-area; `useVisualViewport()` → mobile đặt `max-height: min(88dvh, vv.height−12px)`,
  `bottom: keyboardInset`, và kéo ô đang gõ vào chỗ thấy khi bàn phím đổi cỡ. Harness 375×812 (Nhập tay, cuộn hết): thanh nút y 738–811, thân cuộn kết thúc 811,
  **không còn phần tử nào dưới thanh nút** (P9), `overscroll-behavior: contain` (P10). 375×470: ô tiền 281–337, Lưu 409–453. `?debugKbInset=320` (chỉ dev):
  sheet `bottom: 320px`, Lưu 431–475 ngay trên mép bàn phím giả 492; focus Ghi chú → ô ở 222–266, trên thanh nút. Desktop: hộp giữa 460px như cũ.
- 2026-11-13 — **M2.2: làm bước 1–4, CHƯA đánh [x].** `ExpenseRow` + `ExpenseDayGroup` bọc `memo`, callback ổn định nhận `expense` (bỏ closure mỗi dòng;
  `markPaidWithUndo` dùng `mutate` ổn định), lọc theo `useDeferredValue(filter)`, nhóm ngày `content-visibility: auto; contain-intrinsic-size: auto 300px`.
  Đo `perf.html?n=500`, 375×812, **không throttle** (công cụ của tôi không bật được CPU throttle của DevTools), "chặn" = thời gian handler chạy đồng bộ,
  "xong" = tới khi danh sách đổi, "layout" = reflow ép sau đó:
  | | Dev trước | Dev sau | **Build trước** | **Build sau** |
  |---|---|---|---|---|
  | Mở tab Giao dịch (render / layout) | 290–350 / 107–125 ms | 260–288 / 6–7 ms | 61–83 / 78–92 ms | 60–84 / 5–9 ms |
  | Gõ 1 ký tự: chặn | 114–127 ms | 16–46 ms | 31–42 ms | **3–6 ms** (danh sách xong 13–19 ms) |
  | Gõ ký tự 2: chặn | 79–94 ms | 28–32 ms | 9–12 ms | 3–5 ms |
  | Xoá ô tìm (vẽ lại 500 dòng): chặn / layout | 357–378 / 85–89 ms | 26–28 / 1 ms | 52–58 / 85–95 ms | **3–6** / 1 ms (danh sách xong 46–70 ms, không chặn) |
  Kết quả lọc giống trước ("bú" 56 dòng, "grab" 55, xoá → 500); bấm dòng mở đúng form. Ước tính ×6 cho điện thoại tầm trung: gõ phím ≈ 18–36 ms (**đạt** < 50),
  mở tab ≈ (65–93 ms) × 6 ≈ 400–560 ms (**chưa đạt** < 200). Phần còn lại là React dựng 500 dòng lần đầu — `memo`/`content-visibility` không giúp được.
  Bước 5 (ảo hoá, vướng nhóm "Sắp tới" và tiêu đề ngày) **không làm** vì chưa đo được trên máy thật: cần chủ repo đo bằng bản build trên Android
  (Chrome remote DevTools, Performance) rồi quyết. Cấu hình build harness hiệu năng: `harness/perf.vite.config.mts` (bị exclude, không commit).
- 2026-11-13 — **M3.1 xong (harness + bản build).** Manifest `shortcuts` "Thêm giao dịch" → `/expenses?add=1` (đã có trong `dist/manifest.webmanifest`).
  `useExpensesUrlState` đọc `add=1`; ExpensesPage đợi biết quyền sổ (sổ chỉ xem thì bỏ qua), xoá tham số bằng `replace` trong `useLayoutEffect` (trước khi sheet
  đẩy mục lịch sử) rồi mở sheet. `harness.html?tab=report&add=1` → sheet mở, URL `?tab=report`, Back đóng sheet và không mở lại.
  **Icon tạm:** `public/icons/shortcut-add-96.png` chỉ là `icon-192.png` thu nhỏ (chưa có dấu ＋) — chủ repo nên thay bằng icon riêng.
  Cần chủ repo thử trên Android (PWA đã cài): nhấn giữ icon → "Thêm giao dịch" → mở thẳng form (có thể phải gỡ/cài lại PWA để Android nhận manifest mới).
- 2026-11-13 — **M3.2 xong (harness).** `src/lib/utils/haptic.ts` (`navigator.vibrate?.(12)`, nuốt lỗi; có test), gọi trong `announceCreated` (thêm 1 khoản,
  chuỗi định kỳ, bản nháp AI) và `onSuccess` của `markPaidWithUndo`. Harness (giả `navigator.vibrate` đếm, giả `supabase.rest.fetch`): "Đã trả" lỗi mạng →
  **0** lần rung; "Đã trả" thành công → **1** lần (`12`). Đường "thêm khoản" không thử được trên harness (không có user) — cùng hàm, có unit test.
  Q10 chưa trả lời: bật mặc định, chưa có nút tắt. Cần chủ repo cảm nhận rung trên Android; iOS không rung, không lỗi.
- 2026-11-13 — **M3.5 xong (harness).** `DataFreshness` (trong `QueryStatus.tsx`) dưới thẻ chính của Tổng quan: "Cập nhật lúc HH:mm · Làm mới"
  (`dataUpdatedAt` + `refetch`, nút cao **44px**, đang tải thì `disabled` + `aria-busy="true"` + icon xoay; offline thì ẩn vì dải A2 đã ghi giờ).
  i18n `dataUpdatedAtTime`/`refreshData` đủ 4 ngôn ngữ; `formatClockTime` dùng chung với dải ngoại tuyến (có test). Harness (giả `supabase.rest.fetch`
  chờ rồi trả, giả đồng hồ +7 phút): bấm Làm mới → trong lúc tải nút khoá, `aria-busy=true`; xong → giờ đổi 22:54 → 23:01.

---

## Nguồn tham khảo

- `interactive-widget`: [Chrome — viewport resize behavior](https://developer.chrome.com/blog/viewport-resize-behavior), [caniuse](https://caniuse.com/mdn-html_elements_meta_name_viewport_interactive-widget_resizes-content), [WebKit bug 259770](https://bugs.webkit.org/show_bug.cgi?id=259770)
- [MDN — VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- Manifest shortcuts: [caniuse](https://caniuse.com/mdn-manifests_webapp_shortcuts), [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/app-shortcuts)
- Web Share Target: [MDN share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target), [Chrome docs](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)
- Web Push iOS: [WebKit — Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- Vibration: [caniuse navigator.vibrate](https://caniuse.com/mdn-api_navigator_vibrate)
- Pull-to-refresh: [Chrome — overscroll-behavior](https://developer.chrome.com/blog/overscroll-behavior)
- [TanStack Query — Network Mode](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)
- vite-plugin-pwa: [Periodic SW updates](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates.html), [injectManifest](https://vite-pwa-org.netlify.app/guide/inject-manifest.html)
- Lịch gửi: [Supabase Cron](https://supabase.com/docs/guides/cron), [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
