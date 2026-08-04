-- Weekly Scheduler — user-created custom themes
-- A custom theme is stored as the guided "recipe" (the handful of inputs the
-- builder collects), a sparse per-token "overrides" patch, and an optional
-- "art" block pointing at objects in the theme-art storage bucket. The 20
-- rendered tokens are derived on the client, so the DB never needs to know the
-- token list — adding a token later stays a client-only change.

-- =========================================================================
-- 0. Re-tighten profiles.theme to the 16 keys the client can actually render.
--    An earlier draft migration widened this to 22 for illustrated presets we
--    are not shipping; the client would silently fall back to lavender for
--    those values while the generated types still claimed they were valid.
--    Both statements are no-ops if that draft was never applied.
-- =========================================================================
update public.profiles
set theme = 'lavender'
where theme not in (
  'lavender', 'mint', 'strawberry', 'caramel', 'ocean', 'midnight',
  'peach', 'lemon', 'grape', 'cottoncandy', 'sakura', 'panda',
  'cyber', 'matrix', 'basiclight', 'basicdark'
);

alter table public.profiles drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (
    theme in (
      'lavender', 'mint', 'strawberry', 'caramel', 'ocean', 'midnight',
      'peach', 'lemon', 'grape', 'cottoncandy', 'sakura', 'panda',
      'cyber', 'matrix', 'basiclight', 'basicdark'
    )
  );

-- =========================================================================
-- 1. custom_themes
-- =========================================================================
create table if not exists public.custom_themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  icon text not null default '🎨' check (char_length(icon) between 1 and 16),
  recipe jsonb not null default '{}'::jsonb
    check (jsonb_typeof(recipe) = 'object' and char_length(recipe::text) <= 4096),
  overrides jsonb not null default '{}'::jsonb
    check (jsonb_typeof(overrides) = 'object' and char_length(overrides::text) <= 4096),
  art jsonb
    check (art is null or (jsonb_typeof(art) = 'object' and char_length(art::text) <= 4096)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.custom_themes is
  'User-authored themes. recipe = guided inputs, overrides = sparse per-token patch, art = theme-art storage URLs. Rendered tokens are derived client-side.';

create index if not exists custom_themes_user_id_idx
  on public.custom_themes (user_id, created_at);

drop trigger if exists set_updated_at on public.custom_themes;
create trigger set_updated_at before update on public.custom_themes
  for each row execute function public.set_updated_at();

-- Each theme can own up to 5 storage objects, so an unbounded row count is an
-- unbounded storage bill. The builder enforces the same number client-side;
-- this is the backstop.
create or replace function public.enforce_custom_theme_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.custom_themes where user_id = new.user_id) >= 20 then
    raise exception 'custom theme limit reached (20)' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists custom_themes_limit on public.custom_themes;
create trigger custom_themes_limit before insert on public.custom_themes
  for each row execute function public.enforce_custom_theme_limit();

-- =========================================================================
-- 2. RLS — owner-only. Unlike custom_stickers, themes are edited in place, so
--    this table does need an update policy.
-- =========================================================================
alter table public.custom_themes enable row level security;

drop policy if exists "Custom themes are viewable by owner" on public.custom_themes;
create policy "Custom themes are viewable by owner" on public.custom_themes
  for select using (auth.uid() = user_id);

drop policy if exists "Custom themes are insertable by owner" on public.custom_themes;
create policy "Custom themes are insertable by owner" on public.custom_themes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Custom themes are updatable by owner" on public.custom_themes;
create policy "Custom themes are updatable by owner" on public.custom_themes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Custom themes are deletable by owner" on public.custom_themes;
create policy "Custom themes are deletable by owner" on public.custom_themes
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- 3. profiles -> active custom theme
--    A nullable FK rather than a `custom:<uuid>` sentinel in profiles.theme:
--    `on delete set null` makes "theme deleted on another device" self-heal in
--    the same transaction, and profiles.theme keeps holding the last preset so
--    the fallback is the user's own previous choice instead of hard-coded
--    lavender. The FK cycle with custom_themes.user_id is safe because this
--    column is nullable.
-- =========================================================================
alter table public.profiles
  add column if not exists custom_theme_id uuid
    references public.custom_themes (id) on delete set null;

create index if not exists profiles_custom_theme_id_idx
  on public.profiles (custom_theme_id);

comment on column public.profiles.custom_theme_id is
  'When non-null the active theme is this custom_themes row, and profiles.theme is the preset to fall back to. Always write both columns together.';
