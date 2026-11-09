-- Weekly Scheduler — nội dung sự kiện + ghi chú theo ngày
--
-- 1. tasks.content: mô tả/nội dung dài của sự kiện (tách khỏi `notes` là checklist).
-- 2. daily_notes: ghi chú theo ngày, tích gạch được khi đã xong.

alter table public.tasks
  add column if not exists content text not null default '';

create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  note_date date not null default current_date,
  text text not null check (char_length(trim(text)) > 0),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_notes_user_date_idx
  on public.daily_notes (user_id, note_date desc, created_at);

alter table public.daily_notes enable row level security;

create policy "Daily notes are viewable by owner" on public.daily_notes
  for select using (auth.uid() = user_id);
create policy "Daily notes are insertable by owner" on public.daily_notes
  for insert with check (auth.uid() = user_id);
create policy "Daily notes are updatable by owner" on public.daily_notes
  for update using (auth.uid() = user_id);
create policy "Daily notes are deletable by owner" on public.daily_notes
  for delete using (auth.uid() = user_id);

create trigger set_updated_at before update on public.daily_notes
  for each row execute function public.set_updated_at();
