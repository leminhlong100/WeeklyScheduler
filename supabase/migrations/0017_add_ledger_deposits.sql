-- Weekly Scheduler — nạp tiền vào sổ chia sẻ, chủ sổ xác nhận đã nhận
--
-- Bài toán: người được mời xem sổ (vd. vợ) đưa tiền cho chủ sổ (chồng) giữ hộ.
-- Trước đây chỉ chủ sổ ghi được, nên người đưa tiền không có cách nào nói "em
-- vừa đưa anh 5 triệu" trong app. Giờ người xem tạo một yêu cầu nạp tiền; chủ
-- sổ bấm "Đã nhận" thì sổ có thêm một khoản thu, hoặc "Từ chối".
--
-- Thiết kế:
--   * Bảng riêng `ledger_deposits`, KHÔNG cho người xem ghi thẳng vào
--     `expenses`. Ranh giới "chỉ chủ sổ ghi vào sổ chia sẻ" của 0014 giữ nguyên;
--     khoản thu chỉ sinh ra trong `decide_ledger_deposit()`, do chủ sổ gọi.
--   * Mọi thao tác ghi đi qua RPC: kiểm tra quyền và chuyển trạng thái nằm một
--     chỗ, và duyệt = thêm khoản thu + đổi trạng thái trong cùng transaction.
--   * Sổ cá nhân của người nạp KHÔNG có dòng chi tương ứng: tiền gửi giữ hộ vẫn
--     là tiền của họ, không phải tiền đã tiêu, nên không được rơi vào tổng chi,
--     hạn mức hay báo cáo. App hiện các yêu cầu này thành một mục riêng.
--   * Chủ sổ chỉ duyệt hoặc từ chối, không sửa số tiền: nhận khác số khai thì từ
--     chối, người nạp gửi lại — hai bên luôn thấy cùng một con số.

create table if not exists public.ledger_deposits (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'VND' check (currency in ('VND','JPY','USD')),
  note text not null default '' check (char_length(note) <= 200),
  -- Ngày đưa tiền (người nạp chọn), cũng là ngày của khoản thu khi được duyệt.
  deposited_at date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  -- Khoản thu sinh ra khi duyệt. Chủ sổ xoá khoản thu đó thì cột về NULL, yêu
  -- cầu vẫn là 'approved' (tiền đã nhận thật; sổ là việc của chủ sổ).
  income_expense_id uuid references public.expenses (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ledger_deposits is
  'Yêu cầu nạp tiền của người xem vào sổ chia sẻ. Chủ sổ duyệt → thêm khoản thu vào sổ. Chỉ ghi qua RPC.';

create index if not exists ledger_deposits_ledger_idx
  on public.ledger_deposits (ledger_id, status, created_at desc);
create index if not exists ledger_deposits_from_user_idx
  on public.ledger_deposits (from_user_id, created_at desc);

drop trigger if exists set_updated_at on public.ledger_deposits;
create trigger set_updated_at before update on public.ledger_deposits
  for each row execute function public.set_updated_at();

-- Đọc: người nạp và chủ sổ. Không có policy ghi nào — chỉ RPC bên dưới ghi.
alter table public.ledger_deposits enable row level security;

drop policy if exists "Ledger deposits are viewable by sender or owner" on public.ledger_deposits;
create policy "Ledger deposits are viewable by sender or owner" on public.ledger_deposits
  for select using (auth.uid() = from_user_id or public.is_ledger_owner(ledger_id));

-- =========================================================================
-- RPC
-- =========================================================================

-- Các yêu cầu mình thấy được (mình gửi, hoặc gửi vào sổ mình sở hữu), kèm tên
-- sổ và tên người gửi. `p_ledger_id` NULL = mọi sổ.
create or replace function public.list_ledger_deposits(p_ledger_id uuid default null)
returns table (
  id uuid,
  ledger_id uuid,
  ledger_name text,
  ledger_emoji text,
  from_user_id uuid,
  from_name text,
  amount numeric,
  currency text,
  note text,
  deposited_at date,
  status text,
  decided_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.ledger_id, l.name, l.emoji, d.from_user_id, p.display_name,
         d.amount, d.currency, d.note, d.deposited_at, d.status, d.decided_at,
         d.created_at
  from public.ledger_deposits d
  join public.ledgers l on l.id = d.ledger_id
  join public.profiles p on p.id = d.from_user_id
  where (d.from_user_id = auth.uid() or l.owner_id = auth.uid())
    and (p_ledger_id is null or d.ledger_id = p_ledger_id)
  -- Chờ duyệt lên đầu, rồi mới nhất trước. Giới hạn để thẻ không dài vô tận;
  -- lịch sử thật nằm ở khoản thu trong sổ.
  order by (d.status = 'pending') desc, d.created_at desc
  limit 100;
$$;

-- Số yêu cầu đang chờ ở từng sổ mình sở hữu — cho chấm đỏ trên danh sách sổ.
create or replace function public.count_pending_ledger_deposits()
returns table (ledger_id uuid, pending bigint)
language sql
stable
security definer
set search_path = public
as $$
  select d.ledger_id, count(*)
  from public.ledger_deposits d
  join public.ledgers l on l.id = d.ledger_id
  where l.owner_id = auth.uid() and d.status = 'pending'
  group by d.ledger_id;
$$;

-- Người xem gửi yêu cầu nạp tiền. Trả về id yêu cầu.
create or replace function public.create_ledger_deposit(
  p_ledger_id uuid,
  p_amount numeric,
  p_currency text,
  p_note text,
  p_deposited_at date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  -- Chỉ người được mời xem. Chủ sổ tự ghi khoản thu như bình thường.
  if not public.is_ledger_member(p_ledger_id) then
    raise exception 'not_ledger_member' using errcode = '42501';
  end if;

  insert into public.ledger_deposits (ledger_id, from_user_id, amount, currency, note, deposited_at)
  values (p_ledger_id, auth.uid(), p_amount, p_currency, coalesce(trim(p_note), ''), p_deposited_at)
  returning id into v_id;

  return v_id;
end;
$$;

-- Người nạp rút lại yêu cầu khi chủ sổ chưa quyết.
create or replace function public.cancel_ledger_deposit(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ledger_deposits
  set status = 'cancelled', decided_at = now()
  where id = p_id and from_user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'deposit_not_pending' using errcode = 'P0002';
  end if;
end;
$$;

-- Chủ sổ quyết: duyệt thì thêm khoản thu vào sổ (cùng transaction), không thì
-- từ chối. `p_income_note` là ghi chú cho khoản thu, app truyền vào theo ngôn ngữ
-- của chủ sổ ("Nạp từ Lan: tiền chợ").
create or replace function public.decide_ledger_deposit(
  p_id uuid,
  p_approve boolean,
  p_income_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dep public.ledger_deposits%rowtype;
  v_owner uuid;
  v_expense_id uuid;
begin
  -- Khoá dòng: hai lần bấm "Đã nhận" liền nhau không sinh ra hai khoản thu.
  select * into v_dep from public.ledger_deposits where id = p_id for update;
  if not found then
    raise exception 'deposit_not_found' using errcode = 'P0002';
  end if;

  select owner_id into v_owner from public.ledgers where id = v_dep.ledger_id;
  if v_owner is distinct from auth.uid() then
    raise exception 'not_ledger_owner' using errcode = '42501';
  end if;

  if v_dep.status <> 'pending' then
    raise exception 'deposit_not_pending' using errcode = 'P0002';
  end if;

  if p_approve then
    insert into public.expenses
      (user_id, ledger_id, kind, status, source, amount, currency, note, spent_at)
    values
      (v_owner, v_dep.ledger_id, 'income', 'paid', 'manual', v_dep.amount, v_dep.currency,
       left(coalesce(nullif(trim(p_income_note), ''), v_dep.note), 200), v_dep.deposited_at)
    returning id into v_expense_id;

    update public.ledger_deposits
    set status = 'approved', decided_at = now(), income_expense_id = v_expense_id
    where id = p_id;
  else
    update public.ledger_deposits
    set status = 'rejected', decided_at = now()
    where id = p_id;
  end if;
end;
$$;

revoke execute on function public.list_ledger_deposits(uuid) from public, anon;
revoke execute on function public.count_pending_ledger_deposits() from public, anon;
revoke execute on function public.create_ledger_deposit(uuid, numeric, text, text, date) from public, anon;
revoke execute on function public.cancel_ledger_deposit(uuid) from public, anon;
revoke execute on function public.decide_ledger_deposit(uuid, boolean, text) from public, anon;
grant execute on function public.list_ledger_deposits(uuid) to authenticated;
grant execute on function public.count_pending_ledger_deposits() to authenticated;
grant execute on function public.create_ledger_deposit(uuid, numeric, text, text, date) to authenticated;
grant execute on function public.cancel_ledger_deposit(uuid) to authenticated;
grant execute on function public.decide_ledger_deposit(uuid, boolean, text) to authenticated;
