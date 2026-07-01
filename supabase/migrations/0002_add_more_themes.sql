-- Weekly Scheduler — widen the theme palette
-- Adds 6 new cute themes (peach, lemon, grape, cottoncandy, sakura, panda)
-- to the profiles.theme check constraint.

alter table public.profiles drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (
    theme in (
      'lavender', 'mint', 'strawberry', 'caramel', 'ocean', 'midnight',
      'peach', 'lemon', 'grape', 'cottoncandy', 'sakura', 'panda'
    )
  );
