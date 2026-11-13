-- Weekly Scheduler — ngày bắt đầu kỳ hạn mức
--
-- profiles.budget_cycle_start_day: kỳ hạn mức chạy từ ngày này tới ngày trước
-- đó của tháng sau (vd. lương về ngày 5 → kỳ 5/11 – 4/12). 1 = theo tháng
-- dương lịch như trước. Tối đa 28 để tháng nào cũng có ngày đó.

alter table public.profiles
  add column if not exists budget_cycle_start_day smallint not null default 1
    check (budget_cycle_start_day between 1 and 28);
