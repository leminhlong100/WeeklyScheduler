-- Weekly Scheduler — storage bucket for custom-theme artwork
--
-- Layout: theme-art/<user_id>/<theme_id>/<slot>-<timestamp>.webp
--   slot in (scene, side, figure1, figure2, figure3)
--
-- Reads are public because the URL is embedded in a CSS background-image.
-- Writes are owner-only, gated on the first path segment being the caller's
-- uid. Kept in its own migration because the storage.objects policy DDL is the
-- one statement here that can fail on privileges, and a failure must not roll
-- back the custom_themes table.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'theme-art',
  'theme-art',
  true,
  2097152,                                              -- 2 MB; ~8x the 260 KB client budget
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Note: storage.objects already has RLS enabled by Supabase. Do not run
-- `alter table storage.objects enable row level security` — it is redundant and
-- usually fails on ownership.

-- The public bucket serves /object/public/... without consulting RLS, so this
-- policy is not what makes images load. It is what makes storage.list() work,
-- which the orphan sweep depends on — without it list() silently returns [].
drop policy if exists "Theme art is publicly readable" on storage.objects;
create policy "Theme art is publicly readable" on storage.objects
  for select to public
  using (bucket_id = 'theme-art');

-- storage.foldername() is 1-indexed; [1] is the first path segment.
drop policy if exists "Theme art is insertable by owner" on storage.objects;
create policy "Theme art is insertable by owner" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'theme-art'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Theme art is updatable by owner" on storage.objects;
create policy "Theme art is updatable by owner" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'theme-art'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'theme-art'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Theme art is deletable by owner" on storage.objects;
create policy "Theme art is deletable by owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'theme-art'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
