alter table public.expenses
  add column if not exists is_installment boolean not null default false,
  add column if not exists installment_total_months integer,
  add column if not exists installment_current_month integer,
  add column if not exists installment_group_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expenses_installment_months_valid'
  ) then
    alter table public.expenses
      add constraint expenses_installment_months_valid
      check (
        (
          is_installment = false
          and installment_total_months is null
          and installment_current_month is null
        )
        or
        (
          is_installment = true
          and installment_total_months is not null
          and installment_current_month is not null
          and installment_total_months > 0
          and installment_current_month > 0
          and installment_current_month <= installment_total_months
        )
      );
  end if;
end $$;

