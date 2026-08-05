-- Weekly Scheduler — per-task colour override
-- Adds a nullable `color` to tasks. NULL means "follow the category", which is
-- how every task behaved before this column existed, so old rows need no
-- backfill and a task keeps tracking its category until someone overrides it.

alter table public.tasks
  add column if not exists color text;

-- The value is interpolated into inline styles, so pin it to a plain hex
-- literal at the storage boundary rather than trusting the client form.
alter table public.tasks
  add constraint tasks_color_is_hex check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
