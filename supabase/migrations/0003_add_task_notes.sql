-- Weekly Scheduler — task notes (checklist)
-- Adds a `notes` jsonb column to tasks: an array of { id, text, done }.

alter table public.tasks
  add column if not exists notes jsonb not null default '[]'::jsonb;

alter table public.tasks
  add constraint tasks_notes_is_array check (jsonb_typeof(notes) = 'array');
