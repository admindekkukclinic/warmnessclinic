alter table public.expenses
  add column if not exists title text not null default '';

