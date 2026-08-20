-- Weekly Scheduler — thu nhập nằm cùng bảng với chi tiêu
--
-- Thêm `kind` thay vì dựng bảng `incomes` riêng: mọi thứ đã xây quanh
-- `expenses` (RLS, chuỗi định kỳ, báo cáo theo currency, CSV, cache theo tháng)
-- sẽ phải viết lần thứ hai, và câu hỏi quan trọng nhất — "tháng này còn lại bao
-- nhiêu" — lại cần join hai bảng mỗi lần hỏi. Một cột enum thì số dư chỉ là một
-- phép trừ trên đúng tập dữ liệu đã fetch.
--
-- `amount` vẫn giữ check `> 0`: dấu nằm ở `kind`, không nằm ở số tiền. Lưu thu
-- nhập thành số âm sẽ làm mọi check, mọi tổng và mọi biểu đồ phải nhớ quy ước
-- dấu, và một lần quên là ra số sai mà không có gì báo.

-- =========================================================================
-- expense_categories.kind — danh mục thu và danh mục chi không dùng lẫn
-- =========================================================================
alter table public.expense_categories
  add column if not exists kind text not null default 'expense'
  check (kind in ('expense', 'income'));

comment on column public.expense_categories.kind is
  'expense = danh mục chi, income = danh mục thu. Bộ chọn danh mục lọc theo kind.';

-- `unique (user_id, name)` cũ chặn cả trường hợp hợp lệ: "Đầu tư" vừa có thể là
-- khoản chi (mua cổ phiếu) vừa là khoản thu (cổ tức). Khoá phải gồm cả kind.
--
-- Tìm constraint theo CỘT chứ không theo tên: tên `expense_categories_user_id_name_key`
-- là tên Postgres tự sinh, `drop constraint if exists <tên>` mà tên thực tế khác
-- một chữ thì lệnh chạy êm ru còn constraint cũ vẫn nằm đó — và lỗi chỉ lộ ra
-- nhiều tháng sau, lúc ai đó tạo danh mục thu trùng tên một danh mục chi.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.expense_categories'::regclass
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by att.attname)
        from unnest(con.conkey) as k(attnum)
        join pg_attribute att
          on att.attrelid = con.conrelid and att.attnum = k.attnum
      ) = array['name', 'user_id']
  loop
    execute format('alter table public.expense_categories drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.expense_categories
  drop constraint if exists expense_categories_user_kind_name_key;
alter table public.expense_categories
  add constraint expense_categories_user_kind_name_key unique (user_id, kind, name);

create index if not exists expense_categories_user_kind_idx
  on public.expense_categories (user_id, kind, sort_order);

-- =========================================================================
-- expenses.kind
-- =========================================================================
alter table public.expenses
  add column if not exists kind text not null default 'expense'
  check (kind in ('expense', 'income'));

comment on column public.expenses.kind is
  'expense = tiền ra, income = tiền vào. amount luôn dương; số dư = sum(income) - sum(expense) trong cùng currency.';

-- Danh sách và báo cáo luôn quét một tháng của một user rồi tách kind ở client,
-- nên index tháng cũ vẫn là index chính. Cái này để lọc riêng một kind.
create index if not exists expenses_user_kind_date_idx
  on public.expenses (user_id, kind, spent_at desc);

-- =========================================================================
-- Seed danh mục — thêm 4 danh mục thu
-- =========================================================================
-- `on conflict do nothing` nên hàm gọi lại được nhiều lần: tài khoản đã có đủ 7
-- danh mục chi sẽ chỉ nhận thêm phần thu.
create or replace function public.seed_expense_categories(uid uuid)
returns void
language sql
set search_path = public
as $$
  insert into public.expense_categories (user_id, name, emoji, color, sort_order, kind)
  values
    (uid, 'Ăn uống',   '🍜', '#ff9d5c', 0, 'expense'),
    (uid, 'Di chuyển', '🚗', '#4bb4f0', 1, 'expense'),
    (uid, 'Nhà cửa',   '🏠', '#7b83ff', 2, 'expense'),
    (uid, 'Mua sắm',   '🛒', '#ff7eb6', 3, 'expense'),
    (uid, 'Sức khoẻ',  '💊', '#2fc39a', 4, 'expense'),
    (uid, 'Giải trí',  '🎮', '#b47cf0', 5, 'expense'),
    (uid, 'Khác',      '📦', '#94a3b8', 6, 'expense'),
    (uid, 'Lương',     '💰', '#2fc39a', 0, 'income'),
    (uid, 'Thưởng',    '🎉', '#f0b429', 1, 'income'),
    (uid, 'Đầu tư',    '📈', '#4bb4f0', 2, 'income'),
    (uid, 'Thu khác',  '➕', '#94a3b8', 3, 'income')
  on conflict (user_id, kind, name) do nothing;
$$;

revoke execute on function public.seed_expense_categories(uuid) from public;

-- Backfill: điều kiện phải là "chưa có danh mục THU", không phải "chưa có danh
-- mục nào" như 0009 — mọi tài khoản hiện có đều đã có danh mục chi, nên điều
-- kiện cũ sẽ không khớp ai và không ai nhận được danh mục thu.
do $$
declare
  p record;
begin
  for p in
    select pr.id from public.profiles pr
    where not exists (
      select 1 from public.expense_categories c
      where c.user_id = pr.id and c.kind = 'income'
    )
  loop
    perform public.seed_expense_categories(p.id);
  end loop;
end;
$$;
