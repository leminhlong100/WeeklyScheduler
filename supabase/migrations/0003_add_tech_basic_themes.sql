-- Weekly Scheduler — widen the theme palette
-- Adds 2 tech themes (cyber, matrix) and 2 basic/minimal themes
-- (basiclight, basicdark) to the profiles.theme check constraint.

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
