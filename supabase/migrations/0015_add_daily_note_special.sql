-- Weekly Scheduler — đánh dấu ghi chú theo ngày là "ngày đặc biệt"
--
-- daily_notes.special: ngày có ghi chú đặc biệt (sinh nhật, tiệc, kỷ niệm…)
-- được tô nổi bật trên lịch nhỏ ở thanh bên.

alter table public.daily_notes
  add column if not exists special boolean not null default false;
