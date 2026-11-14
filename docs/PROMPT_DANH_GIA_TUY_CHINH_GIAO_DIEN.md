# Prompt: đánh giá chức năng tùy chỉnh giao diện (theme)

> Dán nguyên phần dưới đường kẻ vào một phiên AI mới (Claude Code, mở tại thư mục repo).

---

Bạn là người đánh giá UX kiêm kỹ sư front-end cho app **Lịch Tuần** (React + Vite + Tailwind v4 + TanStack
Query + Supabase, PWA). Viết và trả lời bằng **tiếng Việt**. Nhiệm vụ: **đánh giá chức năng tùy chỉnh giao diện
(chọn theme có sẵn + tự tạo theme)** trên **máy tính và điện thoại**, rồi đề xuất cái gì cần giữ, cái gì cần
tinh chỉnh, cái gì thừa nên bỏ hoặc giấu đi, sao cho **người dùng phổ thông dùng dễ dàng**.

## Giai đoạn này CHỈ đánh giá, KHÔNG sửa code

Không sửa file trong `src/`, không commit, không đụng DB. Kết quả là một tài liệu kế hoạch (mục "Kết quả cần
nộp"). Chủ repo đọc, trả lời câu hỏi, rồi mới cho làm.

## Bối cảnh cần biết

- Đọc trước: `CLAUDE.md` (nếu có), `docs/KE_HOACH_CAI_TIEN_UX.md` (cách các kế hoạch trước được viết: có
  checklist, nhật ký, câu hỏi cho chủ repo), và phần cuối `docs/KE_HOACH_DIEN_THOAI.md`.
- Mã liên quan:
  - Chọn theme: `src/features/theme/components/ThemePickerModal.tsx`, `ThemeSwatchButton.tsx`, `ContrastBadge.tsx`.
  - Trình tạo theme (Theme Studio): `src/features/theme/studio/ThemeStudioPanel.tsx`, `useStudioDraft.ts`, và 5 tab
    trong `studio/tabs/`: Cơ bản (`BasicsTab`), Màu (`ColorsTab`), Trang trí (`DecorTab`), Hình minh hoạ (`ArtTab`,
    lớn nhất ~600 dòng: tải ảnh, cắt ảnh, nhân vật), Nâng cao (`AdvancedTab`: sửa từng token).
  - Dựng theme từ "công thức": `src/features/theme/recipe/` (`buildTheme.ts`, `validate.ts` — cảnh báo tương phản,
    `types.ts` — các tham số: chế độ sáng/tối, màu nhấn, màu phụ, màu điểm nhấn, kiểu giấy, độ đậm, độ sâu thanh bên,
    kiểu đường kẻ, hình trang trí).
  - Màu dẫn xuất và độ tương phản: `src/features/theme/deriveTheme.ts`, test `src/features/theme/contrast.test.ts`.
  - Lưu theme tự tạo: `src/features/theme/api/customThemesApi.ts`, `hooks/useCustomThemes.ts`, `ThemeContext.tsx`
    (localStorage `weeklyScheduler.theme`, `weeklyScheduler.customThemeId`, `weeklyScheduler.customTheme`).
  - Lối vào: `src/features/layout/components/Header.tsx` (nút theme trên máy tính) và `MobileActionBar.tsx` (menu trên
    điện thoại) — **chỉ có ở trang Lịch tuần** (`src/pages/SchedulerPage.tsx`). Trang Chi tiêu hiện không có lối vào
    chọn theme. Hãy đánh giá điều này.
- Trang thử không cần đăng nhập: `harness.html` + `harness/main.tsx` (không commit, nằm trong `.git/info/exclude`).
  Chạy dev server (`.claude/launch.json`, cấu hình `dev`), mở `http://localhost:5173/harness.html?scheduler` cho
  Lịch tuần, `/harness.html` cho Chi tiêu. Đổi theme có sẵn bằng
  `localStorage.setItem('weeklyScheduler.theme', '<key>')` rồi tải lại. Tài khoản thật chỉ đăng nhập bằng Google
  nên bạn không lưu được theme tự tạo lên Supabase — ghi rõ phần nào chưa kiểm được vì lý do này.
- Pane trình duyệt có thể bị ẩn: khi đó trang không nhận focus/resize; bắn sự kiện bằng tay nếu cần.

## Cần kiểm những gì

Kiểm ở **3 khổ**: máy tính (≥ 1280px), máy tính bảng (768px), điện thoại (375×812, có giả lập cảm ứng). Mỗi
bước chụp màn hình làm bằng chứng.

1. **Tìm thấy và chọn theme có sẵn**
   - Người dùng mới có tìm ra chỗ đổi giao diện không, ở cả hai trang? Mất mấy lần chạm?
   - Bảng chọn: 16 theme có dễ phân biệt không, có xem trước trước khi áp dụng không, đóng/mở có mượt không, nút
     Back của điện thoại có đóng đúng lớp không.
   - Đổi theme có áp dụng ngay cho cả hai trang, có giữ sau khi tải lại không.
2. **Tạo theme mới (luồng chính)**
   - Từ lúc bấm "tạo" đến lúc có một theme dùng được: bao nhiêu bước, bao nhiêu quyết định bắt buộc?
   - Mỗi tab trong Studio: người dùng phổ thông có hiểu từng điều khiển làm gì không (đọc nhãn ở cả 4 ngôn ngữ
     trong `src/features/i18n/locales/`)? Điều khiển nào trùng ý nhau, điều khiển nào tác động quá nhỏ để đáng
     giữ, điều khiển nào nên chỉ hiện ở "Nâng cao"?
   - Xem trước trực tiếp: các nút xem lén / thu nhỏ của panel có rõ không, có che mất phần đang muốn xem không.
   - Cảnh báo tương phản (`validate.ts`, `ContrastBadge`): có dễ hiểu và có chỉ cách sửa không. Lưu ý sau commit
     `65a988d` thanh bên và nút đã **tự đổi màu chữ** theo nền — có cảnh báo hay tham số nào giờ đã vô nghĩa
     (ví dụ "độ sâu thanh bên", vốn sinh ra chỉ để giữ chữ trắng đọc được) không?
   - Lưu, đổi tên, sửa lại, nhân bản, xoá theme tự tạo; bấm Huỷ khi đang sửa dở có hỏi lại không, có mất công không.
3. **Hình minh hoạ (ArtTab)**: tải ảnh, cắt, vị trí, độ mờ, nhân vật. Trên điện thoại có thao tác được bằng ngón
   tay không (kéo, phóng to), ảnh lớn có làm chậm/treo không, ảnh nền có làm chữ khó đọc không.
4. **Điện thoại riêng**: panel Studio có vừa màn hình 375px, có bị bàn phím che ô nhập, vùng chạm ≥ 44px, cuộn bên
   trong panel có lẫn với cuộn trang không, có dùng được một tay không.
5. **Chất lượng chung**: lỗi console, lỗi khi đổi theme liên tục, theme tối/sáng, hiệu năng khi kéo thanh trượt màu
   (có giật không), khả năng truy cập (nhãn cho trình đọc màn hình, điều khiển bằng bàn phím trên máy tính).
6. **Đọc code để tìm phần thừa**: tham số trong `ThemeRecipe`/`TokenOverrides` không còn tác dụng thấy được, code
   chết, tab hoặc khối gần như không ai dùng, chuỗi i18n không còn được dùng.

## Nguyên tắc khi đề xuất

- Ưu tiên **ít lựa chọn hơn nhưng mỗi lựa chọn có tác dụng rõ**. Người dùng phổ thông chỉ cần: chọn theme có sẵn,
  hoặc "chọn 1–2 màu + sáng/tối + đặt tên" là có theme đẹp, đạt tương phản. Mọi thứ khác là tuỳ chọn nâng cao.
- Không đề xuất gì làm hỏng độ tương phản 4.5:1 mà test `contrast.test.ts` đang bảo đảm.
- Theme tự tạo đã lưu của người dùng phải tiếp tục mở được sau khi bỏ/đổi tham số (nói rõ cách chuyển đổi dữ liệu cũ).
- Mỗi đề xuất ghi: vấn đề → bằng chứng (ảnh, file:dòng) → đề xuất → mức ưu tiên (Cao/Vừa/Thấp) → công sức ước tính
  → rủi ro.

## Kết quả cần nộp

Tạo file `docs/KE_HOACH_TUY_CHINH_GIAO_DIEN.md` (tiếng Việt, cùng phong cách các file `KE_HOACH_*` khác) gồm:

1. **Tóm tắt** 5–8 dòng: chức năng đang ở mức nào, 3 vấn đề lớn nhất.
2. **Kết quả kiểm** theo từng mục 1–6 ở trên, tách máy tính / điện thoại, kèm đường dẫn ảnh chụp.
3. **Bảng Giữ / Tinh chỉnh / Bỏ hoặc giấu vào Nâng cao** cho từng điều khiển của Studio và bảng chọn theme.
4. **Kế hoạch sửa** chia đợt nhỏ, mỗi bước có tiêu chí "xong" kiểm được, checklist `[ ]`, và một mục "Nhật ký".
5. **Câu hỏi cho chủ repo** (đánh số Q1, Q2…) cho những chỗ cần quyết về sản phẩm, ví dụ: có thêm lối vào chọn theme
   ở trang Chi tiêu không, có bỏ hẳn tab nào không.
6. **Những gì chưa kiểm được** và lý do (ví dụ cần đăng nhập Google để lưu theme, cần máy iPhone thật).

Xong thì dừng, báo lại đường dẫn file và 3 điểm chính. Không bắt đầu sửa code.
