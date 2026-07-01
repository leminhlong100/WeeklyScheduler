# Weekly Scheduler

A cute weekly planner: drag-and-drop tasks on a week grid, per-user categories, 6 pastel themes, 4 languages (vi/en/zh/ja), and draggable stickers.

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, React Hook Form, Zod, Day.js
- **Backend**: Supabase (Postgres + Auth)
- **Deploy**: Netlify

## Project structure

```
src/
  app/            App shell: providers (query/auth/theme/locale) and router
  pages/          Route-level pages (Login, Signup, Forgot/Reset password, Scheduler)
  routes/         ProtectedRoute / PublicOnlyRoute guards
  features/       One folder per domain: auth, profile, categories, tasks,
                   calendar-nav, theme, i18n, stickers, layout — each with
                   its own api/hooks/components/schemas
  components/     Shared building blocks: shadcn/ui primitives (ui/),
                   generic form/common components
  lib/            Supabase client + generated types, framework-agnostic
                   utilities (date, color, svg shapes, form errors)
  constants/      Week-grid layout constants
supabase/
  migrations/     SQL migrations (run these on your Supabase project)
```

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`. This creates:
   - `profiles`, `categories`, `tasks` tables with foreign keys, indexes and Row Level Security policies scoped to `auth.uid()`.
   - A trigger that creates a `profiles` row and seeds 6 default categories whenever a new `auth.users` row is inserted.
3. (Optional, for the "Continue with Google" button) In **Authentication → Providers**, enable Google and configure its OAuth credentials.
4. Copy your project's **Project URL** and **anon public key** from **Project Settings → API**.

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.

### 3. Install & run

```bash
npm install
npm run dev
```

### 4. Quality checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run build        # production build
```

## Deploy (Netlify)

`netlify.toml` is already configured (build command, publish dir, SPA redirect). When creating the site on Netlify:

1. Connect this repository.
2. Set the same `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars in the Netlify site settings.
3. Deploy — build command and publish directory are picked up from `netlify.toml` automatically.

If you use Google OAuth, add your Netlify URL (and `http://localhost:5173` for local dev) to the redirect URLs allow-list in Supabase's Google provider settings and in the Google Cloud OAuth client.

## Database schema

- **profiles** — one row per `auth.users` id; stores `display_name`, `avatar_url`, and the user's `locale`/`theme` preference.
- **categories** — per-user, user-manageable (`name`, `emoji`, `color`, `sort_order`); seeded with 6 defaults on signup.
- **tasks** — per-user calendar events (`title`, `task_date`, `start_minute`, `duration_minute`, optional `category_id`).

All three tables have RLS enabled so a user can only read/write their own rows.
