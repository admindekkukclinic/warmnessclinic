create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  treatment text not null,
  amount numeric not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric not null check (amount >= 0),
  created_at timestamptz not null default now()
);
