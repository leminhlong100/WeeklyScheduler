-- Weekly Scheduler — chi tiêu định kỳ (tiền nhà, internet, gói cước…)
--
-- Cùng cách làm với chuỗi task lặp ở `0005`: mỗi tháng vẫn là MỘT DÒNG THẬT
-- trong `expenses`, chỉ dùng chung `series_id`. Nhờ vậy sửa số tiền của riêng
-- tháng 8 (năm nay tiền điện cao hơn), xoá lẻ một tháng, hay tính tổng/báo cáo
-- đều chạy y như khoản chi thường — không có nhánh "khoản ảo" nào phải xử lý
-- riêng ở mọi chỗ đọc dữ liệu.
--
-- Cách còn lại (lưu một dòng "quy tắc lặp" rồi sinh ảo lúc đọc) tiết kiệm vài
-- dòng DB nhưng bắt mọi truy vấn phải biết luật lặp, và không sửa lẻ được một
-- kỳ. Với vài chục dòng mỗi năm thì không đáng đánh đổi.

alter table public.expenses
  add column if not exists series_id uuid;

comment on column public.expenses.series_id is
  'Chung cho mọi kỳ sinh ra từ một lần "lặp hàng tháng". NULL = khoản chi lẻ.';

-- Sửa/xoá chuỗi luôn có dạng "kỳ này và các kỳ sau", tức quét
-- (series_id, spent_at >= x) trong phạm vi một user.
create index if not exists expenses_series_idx
  on public.expenses (user_id, series_id, spent_at);
