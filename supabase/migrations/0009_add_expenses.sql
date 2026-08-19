-- Weekly Scheduler — module quản lý chi tiêu
--
-- Hai bảng mới, tách hẳn khỏi `categories`/`tasks` của lịch tuần:
-- `categories` có `unique (user_id, name)` và một trigger seed 6 danh mục công
-- việc lúc signup, nên nhồi thêm danh mục chi tiêu vào đó sẽ phải sửa cả
-- constraint lẫn trigger và làm hỏng ngữ nghĩa của trang lịch.

-- =========================================================================
-- expense_categories
-- =========================================================================
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  emoji text not null default '💸',
  color text not null check (color ~* '^#[0-9a-f]{6}$'),
  -- NULL = không đặt hạn mức. 0 không phải "không đặt" mà là "không được tiêu",
  -- nên check ép giá trị dương và để NULL mang nghĩa vắng mặt.
  monthly_budget numeric(14,2) check (monthly_budget is null or monthly_budget > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

comment on table public.expense_categories is
  'Danh mục chi tiêu, riêng của từng user. Tách khỏi public.categories (danh mục công việc).';

create index if not exists expense_categories_user_idx
  on public.expense_categories (user_id, sort_order);

-- =========================================================================
-- expenses
-- =========================================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Xoá danh mục thì khoản chi vẫn còn (thành "chưa phân loại"), không mất tiền sử.
  category_id uuid references public.expense_categories (id) on delete set null,
  -- numeric, KHÔNG float: sai số nhị phân của float làm lệch tổng tiền.
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'VND' check (currency in ('VND','JPY','USD')),
  note text not null default '',
  spent_at date not null,
  source text not null default 'ai' check (source in ('ai','manual')),
  -- Câu gốc người dùng nhập. Khi AI parse sai, hoặc khi đổi model/prompt và muốn
  -- chạy lại toàn bộ, đây là dữ liệu duy nhất còn để sửa — không lưu là mất vĩnh viễn.
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.expenses.currency is
  'Giữ theo từng dòng, không quy đổi khi lưu. Báo cáo phải tách tổng theo currency.';

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, spent_at desc);
create index if not exists expenses_category_idx
  on public.expenses (category_id);

-- =========================================================================
-- updated_at auto-touch (function set_updated_at đã có từ 0001_init.sql)
-- =========================================================================
drop trigger if exists set_updated_at on public.expense_categories;
create trigger set_updated_at before update on public.expense_categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "Expense categories are viewable by owner" on public.expense_categories;
create policy "Expense categories are viewable by owner" on public.expense_categories
  for select using (auth.uid() = user_id);

drop policy if exists "Expense categories are insertable by owner" on public.expense_categories;
create policy "Expense categories are insertable by owner" on public.expense_categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "Expense categories are updatable by owner" on public.expense_categories;
create policy "Expense categories are updatable by owner" on public.expense_categories
  for update using (auth.uid() = user_id);

drop policy if exists "Expense categories are deletable by owner" on public.expense_categories;
create policy "Expense categories are deletable by owner" on public.expense_categories
  for delete using (auth.uid() = user_id);

drop policy if exists "Expenses are viewable by owner" on public.expenses;
create policy "Expenses are viewable by owner" on public.expenses
  for select using (auth.uid() = user_id);

drop policy if exists "Expenses are insertable by owner" on public.expenses;
create policy "Expenses are insertable by owner" on public.expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists "Expenses are updatable by owner" on public.expenses;
create policy "Expenses are updatable by owner" on public.expenses
  for update using (auth.uid() = user_id);

drop policy if exists "Expenses are deletable by owner" on public.expenses;
create policy "Expenses are deletable by owner" on public.expenses
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- Seed danh mục chi tiêu mặc định
-- =========================================================================
-- Cố ý KHÔNG dùng `security definer`: hàm chỉ được gọi từ `handle_new_user`
-- (đã là definer, chạy quyền owner) và từ phần backfill ngay bên dưới (chạy
-- quyền migration). Để definer thì bất kỳ user đăng nhập nào cũng gọi được với
-- uuid của người khác; để invoker thì RLS ở trên chặn đúng việc đó.
create or replace function public.seed_expense_categories(uid uuid)
returns void
language sql
set search_path = public
as $$
  insert into public.expense_categories (user_id, name, emoji, color, sort_order)
  values
    (uid, 'Ăn uống',    '🍜', '#ff9d5c', 0),
    (uid, 'Di chuyển',  '🚗', '#4bb4f0', 1),
    (uid, 'Nhà cửa',    '🏠', '#7b83ff', 2),
    (uid, 'Mua sắm',    '🛒', '#ff7eb6', 3),
    (uid, 'Sức khoẻ',   '💊', '#2fc39a', 4),
    (uid, 'Giải trí',   '🎮', '#b47cf0', 5),
    (uid, 'Khác',       '📦', '#94a3b8', 6)
  on conflict (user_id, name) do nothing;
$$;

revoke execute on function public.seed_expense_categories(uuid) from public;

-- Trigger signup: giữ nguyên phần tạo profile + 6 danh mục công việc của
-- 0001_init.sql, chỉ nối thêm một dòng seed danh mục chi tiêu.
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

  perform public.seed_expense_categories(new.id);

  return new;
end;
$$;

-- Backfill: trigger trên chỉ chạy cho row MỚI trong auth.users, nên mọi tài
-- khoản đã tồn tại sẽ không bao giờ được seed nếu thiếu đoạn này.
do $$
declare
  p record;
begin
  for p in
    select pr.id from public.profiles pr
    where not exists (
      select 1 from public.expense_categories c where c.user_id = pr.id
    )
  loop
    perform public.seed_expense_categories(p.id);
  end loop;
end;
$$;
