-- Weekly Scheduler — task completion + weekly repeat series
--
-- `done`      : whether the task has been checked off.
-- `series_id` : shared by every task created from one "repeat weekly" run, so
--               the app can offer "edit/delete the rest of the series". Each
--               occurrence is still a real row, so dragging, resizing, notes
--               and single-task delete keep working untouched.

alter table public.tasks
  add column if not exists done boolean not null default false;

alter table public.tasks
  add column if not exists series_id uuid;

-- Series edits always target "this occurrence and every later one", i.e. a
-- (series_id, task_date >= x) scan within one user's rows.
create index if not exists tasks_series_idx on public.tasks (user_id, series_id, task_date);
