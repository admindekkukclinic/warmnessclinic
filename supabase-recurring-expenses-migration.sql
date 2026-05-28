create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_id uuid references public.expense_categories(id) on delete restrict,
  category text not null,
  monthly_amount numeric not null check (monthly_amount >= 0),
  payment_date date,
  start_month date not null,
  end_month date not null,
  total_months integer not null check (total_months > 0),
  paid_months integer not null default 0 check (paid_months >= 0),
  payment_day integer not null check (payment_day between 1 and 31),
  fixed_monthly_amount boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.recurring_expenses
  add column if not exists paid_months integer not null default 0,
  add column if not exists fixed_monthly_amount boolean not null default true,
  add column if not exists payment_date date;

alter table public.expenses
  add column if not exists expense_type text not null default 'one_time',
  add column if not exists recurring_expense_id uuid references public.recurring_expenses(id) on delete set null,
  add column if not exists paid_month date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recurring_expenses_month_range_valid'
  ) then
    alter table public.recurring_expenses
      add constraint recurring_expenses_month_range_valid
      check (start_month <= end_month);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'recurring_expenses_paid_months_valid'
  ) then
    alter table public.recurring_expenses
      add constraint recurring_expenses_paid_months_valid
      check (paid_months >= 0 and paid_months <= total_months);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'expenses_type_valid'
  ) then
    alter table public.expenses
      add constraint expenses_type_valid
      check (expense_type in ('one_time', 'recurring'));
  end if;
end $$;

create index if not exists recurring_expenses_active_idx
on public.recurring_expenses (is_active, start_month, end_month);

create index if not exists expenses_paid_month_idx
on public.expenses (paid_month);

create unique index if not exists unique_recurring_payment_month
on public.expenses (recurring_expense_id, paid_month)
where recurring_expense_id is not null and paid_month is not null;

alter table public.recurring_expenses enable row level security;

drop policy if exists "Allow public read recurring expenses" on public.recurring_expenses;
drop policy if exists "Allow public insert recurring expenses" on public.recurring_expenses;
drop policy if exists "Allow public update recurring expenses" on public.recurring_expenses;
drop policy if exists "Allow public delete recurring expenses" on public.recurring_expenses;

create policy "Allow public read recurring expenses"
on public.recurring_expenses for select
to anon, authenticated
using (true);

create policy "Allow public insert recurring expenses"
on public.recurring_expenses for insert
to anon, authenticated
with check (true);

create policy "Allow public update recurring expenses"
on public.recurring_expenses for update
to anon, authenticated
using (true)
with check (true);

create policy "Allow public delete recurring expenses"
on public.recurring_expenses for delete
to anon, authenticated
using (true);
