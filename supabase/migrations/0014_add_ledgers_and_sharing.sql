-- Weekly Scheduler — sổ chi tiêu chia sẻ (ledgers)
--
-- Bài toán: một người giữ tiền hộ người khác (ví dụ chồng giữ tiền cho vợ), ghi
-- lại từng khoản thu/chi, và người kia đăng nhập tài khoản của mình để XEM.
--
-- Thiết kế:
--   * `ledgers` — một sổ riêng do một user sở hữu. Sổ "Cá nhân" KHÔNG có dòng
--     nào ở đây: `expenses.ledger_id IS NULL` nghĩa là sổ cá nhân của
--     `user_id`. Nhờ vậy không phải backfill dữ liệu cũ, không phải sửa trigger
--     signup, và mọi khoản chi hiện có giữ nguyên ý nghĩa.
--   * `ledger_members` — người được mời xem (role 'viewer'). Chỉ chủ sổ ghi;
--     người xem chỉ đọc, RLS chặn mọi thao tác ghi của họ.
--   * Mời bằng mã (`ledgers.invite_code`), không bằng email: tra user theo
--     email nghĩa là để lộ ai có tài khoản. Chủ sổ gửi link `/join/<mã>`, người
--     kia đăng nhập rồi mở link; chủ sổ tắt hoặc đổi mã bất cứ lúc nào.
--   * Danh mục chi tiêu vẫn thuộc về user (dùng chung cho mọi sổ của họ). Người
--     xem được đọc danh mục của chủ sổ để hiện đúng tên/emoji.

-- =========================================================================
-- ledgers
-- =========================================================================
create table if not exists public.ledgers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  emoji text not null default '👛',
  -- NULL = không nhận người mới. 32 ký tự hex ngẫu nhiên (128 bit), đủ để không
  -- đoán được; mã cũ mất hiệu lực ngay khi đổi.
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ledgers is
  'Sổ chi tiêu riêng, có thể chia sẻ cho người khác xem. Sổ cá nhân = expenses.ledger_id IS NULL, không có dòng ở đây.';

create index if not exists ledgers_owner_idx on public.ledgers (owner_id, created_at);

drop trigger if exists set_updated_at on public.ledgers;
create trigger set_updated_at before update on public.ledgers
  for each row execute function public.set_updated_at();

-- =========================================================================
-- ledger_members
-- =========================================================================
create table if not exists public.ledger_members (
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer')),
  created_at timestamptz not null default now(),
  primary key (ledger_id, user_id)
);

create index if not exists ledger_members_user_idx on public.ledger_members (user_id);

-- =========================================================================
-- expenses.ledger_id
-- =========================================================================
-- Xoá sổ là xoá luôn các khoản trong sổ: dồn chúng sang sổ cá nhân sẽ trộn tiền
-- của hai người mà không ai nhận ra. UI hỏi xác nhận trước khi xoá.
alter table public.expenses
  add column if not exists ledger_id uuid references public.ledgers (id) on delete cascade;

comment on column public.expenses.ledger_id is
  'NULL = sổ cá nhân của user_id. Khác NULL = thuộc sổ chia sẻ đó (user_id luôn là chủ sổ).';

create index if not exists expenses_ledger_date_idx
  on public.expenses (ledger_id, spent_at desc)
  where ledger_id is not null;

-- =========================================================================
-- Helpers cho RLS
-- =========================================================================
-- `security definer` để policy của bảng này đọc được bảng kia mà không vướng
-- RLS của bảng kia (và không đệ quy policy). Mỗi hàm chỉ trả lời về
-- `auth.uid()`, nên không lộ gì về người khác.
create or replace function public.is_ledger_owner(p_ledger_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ledgers l
    where l.id = p_ledger_id and l.owner_id = auth.uid()
  );
$$;

create or replace function public.is_ledger_member(p_ledger_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ledger_members m
    where m.ledger_id = p_ledger_id and m.user_id = auth.uid()
  );
$$;

-- "Người đang đăng nhập có đang xem một sổ nào của `p_owner` không" — để đọc
-- danh mục chi tiêu của chủ sổ.
create or replace function public.views_ledger_of(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ledger_members m
    join public.ledgers l on l.id = m.ledger_id
    where m.user_id = auth.uid() and l.owner_id = p_owner
  );
$$;

-- =========================================================================
-- RLS: ledgers
-- =========================================================================
alter table public.ledgers enable row level security;
alter table public.ledger_members enable row level security;

-- Người xem không đọc thẳng bảng này (sẽ thấy invite_code); họ dùng
-- `list_my_ledgers()` bên dưới.
drop policy if exists "Ledgers are viewable by owner" on public.ledgers;
create policy "Ledgers are viewable by owner" on public.ledgers
  for select using (auth.uid() = owner_id);

drop policy if exists "Ledgers are insertable by owner" on public.ledgers;
create policy "Ledgers are insertable by owner" on public.ledgers
  for insert with check (auth.uid() = owner_id);

drop policy if exists "Ledgers are updatable by owner" on public.ledgers;
create policy "Ledgers are updatable by owner" on public.ledgers
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Ledgers are deletable by owner" on public.ledgers;
create policy "Ledgers are deletable by owner" on public.ledgers
  for delete using (auth.uid() = owner_id);

-- =========================================================================
-- RLS: ledger_members
-- =========================================================================
-- Không có policy INSERT: chỉ vào được qua `join_ledger()` (cần đúng mã mời).
drop policy if exists "Ledger members are viewable by owner or self" on public.ledger_members;
create policy "Ledger members are viewable by owner or self" on public.ledger_members
  for select using (auth.uid() = user_id or public.is_ledger_owner(ledger_id));

-- Chủ sổ gỡ người xem; người xem tự rời sổ.
drop policy if exists "Ledger members are deletable by owner or self" on public.ledger_members;
create policy "Ledger members are deletable by owner or self" on public.ledger_members
  for delete using (auth.uid() = user_id or public.is_ledger_owner(ledger_id));

-- =========================================================================
-- RLS: expenses — thêm quyền đọc cho người xem, siết quyền ghi theo sổ
-- =========================================================================
drop policy if exists "Expenses are viewable by ledger members" on public.expenses;
create policy "Expenses are viewable by ledger members" on public.expenses
  for select using (ledger_id is not null and public.is_ledger_member(ledger_id));

-- Ghi vào một sổ chia sẻ thì phải là chủ sổ đó: không ai nhét được khoản chi
-- vào sổ của người khác chỉ bằng cách đặt ledger_id.
drop policy if exists "Expenses are insertable by owner" on public.expenses;
create policy "Expenses are insertable by owner" on public.expenses
  for insert with check (
    auth.uid() = user_id
    and (ledger_id is null or public.is_ledger_owner(ledger_id))
  );

drop policy if exists "Expenses are updatable by owner" on public.expenses;
create policy "Expenses are updatable by owner" on public.expenses
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (ledger_id is null or public.is_ledger_owner(ledger_id))
  );

-- =========================================================================
-- RLS: expense_categories — người xem đọc được danh mục của chủ sổ
-- =========================================================================
drop policy if exists "Expense categories are viewable by ledger viewers" on public.expense_categories;
create policy "Expense categories are viewable by ledger viewers" on public.expense_categories
  for select using (public.views_ledger_of(user_id));

-- =========================================================================
-- RPC
-- =========================================================================

-- Mọi sổ mà người đang đăng nhập sở hữu hoặc được mời xem, kèm tên chủ sổ (bảng
-- profiles vẫn chỉ cho chủ đọc; hàm này chỉ trả tên của chủ các sổ mình xem).
create or replace function public.list_my_ledgers()
returns table (
  id uuid,
  name text,
  emoji text,
  owner_id uuid,
  owner_name text,
  role text,
  invite_code text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.name, l.emoji, l.owner_id, p.display_name,
         'owner'::text, l.invite_code, l.created_at
  from public.ledgers l
  join public.profiles p on p.id = l.owner_id
  where l.owner_id = auth.uid()
  union all
  select l.id, l.name, l.emoji, l.owner_id, p.display_name,
         m.role, null::text, l.created_at
  from public.ledger_members m
  join public.ledgers l on l.id = m.ledger_id
  join public.profiles p on p.id = l.owner_id
  where m.user_id = auth.uid()
  order by 8;
$$;

-- Ai đang xem một sổ. Chỉ chủ sổ gọi được (người xem không cần biết ai khác).
create or replace function public.list_ledger_members(p_ledger_id uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, p.display_name, m.created_at
  from public.ledger_members m
  join public.profiles p on p.id = m.user_id
  where m.ledger_id = p_ledger_id
    and public.is_ledger_owner(p_ledger_id)
  order by m.created_at;
$$;

-- Bật (tạo mã mới) hoặc tắt link mời. Mã cũ mất hiệu lực ngay.
create or replace function public.set_ledger_invite(p_ledger_id uuid, p_enabled boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_ledger_owner(p_ledger_id) then
    raise exception 'not_ledger_owner' using errcode = '42501';
  end if;

  v_code := case when p_enabled then replace(gen_random_uuid()::text, '-', '') end;
  update public.ledgers set invite_code = v_code where id = p_ledger_id;
  return v_code;
end;
$$;

-- Người được mời mở link: thành người xem của sổ. Trả về id sổ để UI mở nó.
create or replace function public.join_ledger(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger public.ledgers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_ledger from public.ledgers where invite_code = p_code;
  if not found then
    raise exception 'invalid_invite_code' using errcode = 'P0002';
  end if;

  -- Chủ sổ tự mở link của mình: không làm gì, chỉ mở sổ.
  if v_ledger.owner_id <> auth.uid() then
    insert into public.ledger_members (ledger_id, user_id)
    values (v_ledger.id, auth.uid())
    on conflict do nothing;
  end if;

  return v_ledger.id;
end;
$$;

-- Số dư từ trước tới nay của một sổ, theo từng đơn vị tiền, chỉ tính khoản đã
-- thu/chi thật (`paid`). `security invoker`: RLS của expenses quyết định ai đọc
-- được, hàm không mở thêm quyền nào.
create or replace function public.ledger_balance(p_ledger_id uuid)
returns table (currency text, income numeric, expense numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select e.currency,
         coalesce(sum(e.amount) filter (where e.kind = 'income'), 0),
         coalesce(sum(e.amount) filter (where e.kind = 'expense'), 0)
  from public.expenses e
  where e.ledger_id = p_ledger_id and e.status = 'paid'
  group by e.currency
  order by e.currency;
$$;

revoke execute on function public.list_my_ledgers() from public, anon;
revoke execute on function public.list_ledger_members(uuid) from public, anon;
revoke execute on function public.set_ledger_invite(uuid, boolean) from public, anon;
revoke execute on function public.join_ledger(text) from public, anon;
revoke execute on function public.ledger_balance(uuid) from public, anon;
grant execute on function public.list_my_ledgers() to authenticated;
grant execute on function public.list_ledger_members(uuid) to authenticated;
grant execute on function public.set_ledger_invite(uuid, boolean) to authenticated;
grant execute on function public.join_ledger(text) to authenticated;
grant execute on function public.ledger_balance(uuid) to authenticated;
