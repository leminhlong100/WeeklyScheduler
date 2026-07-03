-- Weekly Scheduler — custom stickers table
-- Uploaded sticker images now sync through the account instead of staying in
-- one browser's localStorage, so they follow the user across devices.

create table if not exists public.custom_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  src text not null,
  created_at timestamptz not null default now()
);

create index if not exists custom_stickers_user_id_idx on public.custom_stickers (user_id);

alter table public.custom_stickers enable row level security;

create policy "Custom stickers are viewable by owner" on public.custom_stickers
  for select using (auth.uid() = user_id);

create policy "Custom stickers are insertable by owner" on public.custom_stickers
  for insert with check (auth.uid() = user_id);

create policy "Custom stickers are deletable by owner" on public.custom_stickers
  for delete using (auth.uid() = user_id);
