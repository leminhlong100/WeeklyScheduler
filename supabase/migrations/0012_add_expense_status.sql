-- Weekly Scheduler — tách "dự kiến" khỏi "đã trả"
--
-- `0010` sinh sẵn mọi kỳ của một chuỗi định kỳ thành dòng thật, kể cả các tháng
-- chưa tới. Hệ quả: mở báo cáo tháng sau đã thấy đủ tiền nhà, tiền mạng như thể
-- đã trả — tổng tháng, số dư và cảnh báo vượt hạn mức đều nói một điều chưa xảy ra.
--
-- `status` sửa đúng chỗ đó. Kỳ chưa tới lưu 'planned' và KHÔNG được cộng vào
-- tổng thực chi; tới lúc trả thật thì người dùng bấm một nút để chuyển 'paid'.
--
-- Cố ý KHÔNG tự động chuyển 'planned' -> 'paid' khi ngày trôi qua: ngày đến hạn
-- không phải bằng chứng đã trả, và một job tự đánh dấu sẽ ghi vào sổ những
-- khoản có thể chưa hề thanh toán. Quá hạn thì UI tô màu nhắc, người dùng vẫn
-- là người xác nhận.
alter table public.expenses
  add column if not exists status text not null default 'paid'
  check (status in ('paid', 'planned'));

comment on column public.expenses.status is
  'paid = đã thực sự thu/chi, tính vào tổng và số dư. planned = kỳ định kỳ chưa tới, chỉ hiện riêng.';

-- Truy vấn hay dùng: "các kỳ planned của user này, sớm nhất trước" để nhắc đến hạn.
create index if not exists expenses_user_status_idx
  on public.expenses (user_id, status, spent_at);
