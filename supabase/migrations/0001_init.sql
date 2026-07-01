-- Weekly Scheduler — initial schema
-- Tables: profiles, categories, tasks
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

-- =========================================================================
-- profiles
-- =========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  locale text not null default 'vi' check (locale in ('vi', 'en', 'zh', 'ja')),
  theme text not null default 'lavender'
    check (theme in ('lavender', 'mint', 'strawberry', 'caramel', 'ocean', 'midnight')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user, extends auth.users with app preferences.';

-- =========================================================================
-- categories
-- =========================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  emoji text not null default '📌',
  color text not null check (color ~* '^#[0-9a-f]{6}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists categories_user_id_idx on public.categories (user_id);

-- =========================================================================
-- tasks
-- =========================================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null check (char_length(trim(title)) > 0),
  task_date date not null,
  start_minute integer not null check (start_minute >= 0 and start_minute < 1440),
  duration_minute integer not null check (duration_minute > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_date_idx on public.tasks (user_id, task_date);
create index if not exists tasks_category_id_idx on public.tasks (category_id);

-- =========================================================================
-- updated_at auto-touch trigger
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- =========================================================================
-- new user bootstrap: create profile row + seed default categories
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.categories (user_id, name, emoji, color, sort_order)
  values
    (new.id, 'Công việc', '💼', '#7b83ff', 0),
    (new.id, 'Sức khỏe', '🌿', '#2fc39a', 1),
    (new.id, 'Học tập', '📚', '#4bb4f0', 2),
    (new.id, 'Cá nhân', '🌸', '#b47cf0', 3),
    (new.id, 'Xã hội', '💗', '#ff7eb6', 4),
    (new.id, 'Bữa ăn', '🍰', '#ff9d5c', 5);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Categories are viewable by owner" on public.categories
  for select using (auth.uid() = user_id);

create policy "Categories are insertable by owner" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "Categories are updatable by owner" on public.categories
  for update using (auth.uid() = user_id);

create policy "Categories are deletable by owner" on public.categories
  for delete using (auth.uid() = user_id);

create policy "Tasks are viewable by owner" on public.tasks
  for select using (auth.uid() = user_id);

create policy "Tasks are insertable by owner" on public.tasks
  for insert with check (auth.uid() = user_id);

create policy "Tasks are updatable by owner" on public.tasks
  for update using (auth.uid() = user_id);

create policy "Tasks are deletable by owner" on public.tasks
  for delete using (auth.uid() = user_id);
