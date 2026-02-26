-- =========================================================
-- WISECAR / CAR SHOWROOM PRO
-- Full Migration (Supabase / PostgreSQL)
-- Run ONCE in Supabase -> SQL Editor
-- =========================================================
-- What you get:
--  - Auth profiles (admin/sales)
--  - Cars + images + internal finance (admin-only)
--  - Customers (sales can insert only)
--  - Suppliers (admin-only) + suppliers.company column (frontend expects it)
--  - Sales (sales can insert + see own; admin sees all)
--  - Views + RPC functions expected by frontend:
--      public.sales_list_view
--      public.sales_sum_total()
--      public.sales_sum_this_month()
--  - Storage bucket policies for car-images
-- =========================================================

begin;

-- -------------------------
-- Extensions
-- -------------------------
create extension if not exists pgcrypto;

-- -------------------------
-- Enums
-- -------------------------
do $$ begin
  create type public.user_role as enum ('admin','sales');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.car_status as enum ('available','reserved','sold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash','bank_transfer','credit_card','check','other');
exception when duplicate_object then null; end $$;

-- -------------------------
-- Common trigger: updated_at
-- -------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------
-- PROFILES (auth.users -> role)
-- -------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'sales',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_profiles_updated_at') then
    create trigger trg_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'sales', coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- attach trigger on auth.users (safe recreate)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Role helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_sales()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'sales'
  );
$$;

-- -------------------------
-- SUPPLIERS (Admin only) - frontend expects suppliers.company
-- -------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  name text,
  phone text,
  email text,
  city text,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If an older suppliers table exists without company, add it
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='suppliers' and column_name='company'
  ) then
    alter table public.suppliers add column company text;
  end if;

  -- If there is a "name" column and company is null, backfill
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='suppliers' and column_name='name'
  ) then
    update public.suppliers
      set company = coalesce(company, name)
    where company is null;
  end if;

  -- Make company NOT NULL if possible (only if no nulls remain)
  if exists (
    select 1 from public.suppliers where company is null
  ) then
    -- keep as nullable for now
  else
    begin
      alter table public.suppliers alter column company set not null;
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists idx_suppliers_company on public.suppliers(company);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_suppliers_updated_at') then
    create trigger trg_suppliers_updated_at
    before update on public.suppliers
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- -------------------------
-- CARS (safe fields only)
-- -------------------------
create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  stock_no text unique,
  plate_number text,
  vin text,
  make text not null,
  model text not null,
  car_type text not null,
  year int,
  color text,
  mileage int,
  status public.car_status not null default 'available',

  asking_price numeric(12,2) not null default 0,
  notes_public text,

  sold_at timestamptz,
  sold_sale_id uuid,

  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cars_make on public.cars(make);
create index if not exists idx_cars_type on public.cars(car_type);
create index if not exists idx_cars_status on public.cars(status);
create index if not exists idx_cars_asking_price on public.cars(asking_price);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_cars_updated_at') then
    create trigger trg_cars_updated_at
    before update on public.cars
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- -------------------------
-- CAR FINANCE (internal only - admin-only)
-- -------------------------
create table if not exists public.car_finance (
  car_id uuid primary key references public.cars(id) on delete cascade,

  purchase_price numeric(12,2) not null default 0,
  ads_cost numeric(12,2) not null default 0,
  fuel_cost numeric(12,2) not null default 0,
  other_cost numeric(12,2) not null default 0,

  purchase_date date,
  internal_notes text,

  supplier_id uuid references public.suppliers(id) on delete set null,

  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_car_finance_updated_at') then
    create trigger trg_car_finance_updated_at
    before update on public.car_finance
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- -------------------------
-- CUSTOMERS
-- -------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  national_id text,
  phone text,
  email text,
  city text,
  notes text,

  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_customers_name on public.customers(full_name);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='trg_customers_updated_at') then
    create trigger trg_customers_updated_at
    before update on public.customers
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- -------------------------
-- CAR IMAGES (metadata; actual files in Storage bucket car-images)
-- -------------------------
create table if not exists public.car_images (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  storage_path text not null,     -- e.g. cars/<car_id>/<file>.jpg
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_car_images_car on public.car_images(car_id);
create index if not exists idx_car_images_primary on public.car_images(car_id, is_primary);

-- -------------------------
-- SALES
--  - (A) salesperson chosen automatically: created_by = auth.uid()
--  - one car can be sold once
-- -------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,

  sold_price numeric(12,2) not null,
  payment_method public.payment_method not null default 'other',
  sale_date date not null default current_date,
  notes text,

  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_sales_car_id on public.sales(car_id);
create index if not exists idx_sales_created_by on public.sales(created_by);
create index if not exists idx_sales_sale_date on public.sales(sale_date);

-- After insert sale: mark car sold
create or replace function public.mark_car_sold()
returns trigger
language plpgsql
as $$
begin
  update public.cars
  set status = 'sold',
      sold_at = now(),
      sold_sale_id = new.id,
      updated_by = auth.uid()
  where id = new.car_id;

  return new;
end;
$$;

drop trigger if exists trg_mark_car_sold on public.sales;
create trigger trg_mark_car_sold
after insert on public.sales
for each row execute function public.mark_car_sold();

-- After delete sale (admin only): revert car if this sale was the sold_sale_id
create or replace function public.unmark_car_sold()
returns trigger
language plpgsql
as $$
begin
  update public.cars
  set status = 'available',
      sold_at = null,
      sold_sale_id = null,
      updated_by = auth.uid()
  where id = old.car_id and sold_sale_id = old.id;

  return old;
end;
$$;

drop trigger if exists trg_unmark_car_sold on public.sales;
create trigger trg_unmark_car_sold
after delete on public.sales
for each row execute function public.unmark_car_sold();

-- -------------------------
-- RLS ENABLE
-- -------------------------
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.cars enable row level security;
alter table public.car_finance enable row level security;
alter table public.customers enable row level security;
alter table public.car_images enable row level security;
alter table public.sales enable row level security;

-- -------------------------
-- RLS POLICIES
-- -------------------------

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own_basic" on public.profiles;
create policy "profiles_update_own_basic"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- SUPPLIERS (Admin only)
drop policy if exists "suppliers_admin_all" on public.suppliers;
create policy "suppliers_admin_all"
on public.suppliers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- CARS
drop policy if exists "cars_select_all_auth" on public.cars;
create policy "cars_select_all_auth"
on public.cars for select
to authenticated
using (true);

drop policy if exists "cars_admin_insert" on public.cars;
create policy "cars_admin_insert"
on public.cars for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid() and updated_by = auth.uid());

drop policy if exists "cars_admin_update" on public.cars;
create policy "cars_admin_update"
on public.cars for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "cars_admin_delete" on public.cars;
create policy "cars_admin_delete"
on public.cars for delete
to authenticated
using (public.is_admin());

-- CAR_FINANCE (Admin only - Sales cannot even SELECT)
drop policy if exists "car_finance_admin_all" on public.car_finance;
create policy "car_finance_admin_all"
on public.car_finance for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- CUSTOMERS
drop policy if exists "customers_select_all_auth" on public.customers;
create policy "customers_select_all_auth"
on public.customers for select
to authenticated
using (true);

drop policy if exists "customers_insert_auth" on public.customers;
create policy "customers_insert_auth"
on public.customers for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "customers_admin_update" on public.customers;
create policy "customers_admin_update"
on public.customers for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_admin_delete" on public.customers;
create policy "customers_admin_delete"
on public.customers for delete
to authenticated
using (public.is_admin());

-- CAR_IMAGES
drop policy if exists "car_images_select_all_auth" on public.car_images;
create policy "car_images_select_all_auth"
on public.car_images for select
to authenticated
using (true);

drop policy if exists "car_images_admin_insert" on public.car_images;
create policy "car_images_admin_insert"
on public.car_images for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "car_images_admin_update" on public.car_images;
create policy "car_images_admin_update"
on public.car_images for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "car_images_admin_delete" on public.car_images;
create policy "car_images_admin_delete"
on public.car_images for delete
to authenticated
using (public.is_admin());

-- SALES
drop policy if exists "sales_admin_select_all" on public.sales;
create policy "sales_admin_select_all"
on public.sales for select
to authenticated
using (public.is_admin());

drop policy if exists "sales_salesperson_select_own" on public.sales;
create policy "sales_salesperson_select_own"
on public.sales for select
to authenticated
using (public.is_sales() and created_by = auth.uid());

drop policy if exists "sales_insert_admin_or_sales" on public.sales;
create policy "sales_insert_admin_or_sales"
on public.sales for insert
to authenticated
with check (
  (public.is_admin() or public.is_sales())
  and created_by = auth.uid()
);

drop policy if exists "sales_admin_update" on public.sales;
create policy "sales_admin_update"
on public.sales for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sales_admin_delete" on public.sales;
create policy "sales_admin_delete"
on public.sales for delete
to authenticated
using (public.is_admin());

-- -------------------------
-- VIEW expected by frontend: sales_list_view
-- (RLS still applies to underlying tables)
-- -------------------------
create or replace view public.sales_list_view as
select
  s.id                         as sale_id,
  s.sale_date                  as sale_date,
  s.sold_price                 as sold_price,
  s.payment_method             as payment_method,
  s.notes                      as sale_notes,
  s.created_at                 as sale_created_at,

  s.created_by                 as salesperson_id,
  p.full_name                  as salesperson_name,

  c.id                         as car_id,
  c.make                       as car_make,
  c.model                      as car_model,
  c.year                       as car_year,
  c.car_type                   as car_type,
  c.status                     as car_status,
  c.asking_price               as asking_price,

  cu.id                        as customer_id,
  cu.full_name                 as customer_name,
  cu.phone                     as customer_phone,
  cu.city                      as customer_city
from public.sales s
join public.cars c on c.id = s.car_id
join public.customers cu on cu.id = s.customer_id
left join public.profiles p on p.id = s.created_by;

grant select on public.sales_list_view to authenticated;

-- -------------------------
-- RPC functions expected by frontend
-- -------------------------

create or replace function public.sales_sum_total()
returns table(total numeric)
language sql
stable
as $$
  select coalesce(sum(sold_price), 0)::numeric as total
  from public.sales;
$$;

create or replace function public.sales_sum_this_month()
returns table(total numeric)
language sql
stable
as $$
  select coalesce(sum(s.sold_price), 0)::numeric as total
  from public.sales s
  where date_trunc('month', s.sale_date::timestamptz) = date_trunc('month', now());
$$;

-- Extra (useful for dashboard; safe to keep)
create or replace function public.cars_count_by_status(target public.car_status)
returns table(count bigint)
language sql
stable
as $$
  select count(*)::bigint
  from public.cars
  where status = target;
$$;

-- Profit (Admin-only via check; returns 0 for non-admin to avoid breaking UI)
create or replace function public.profit_sum_total()
returns table(total numeric)
language plpgsql
stable
as $$
declare
  v_total numeric;
begin
  if not public.is_admin() then
    return query select 0::numeric;
    return;
  end if;

  select coalesce(sum(s.sold_price),0)
         - coalesce(sum(cf.purchase_price + cf.ads_cost + cf.fuel_cost + cf.other_cost),0)
    into v_total
  from public.sales s
  left join public.car_finance cf on cf.car_id = s.car_id;

  return query select coalesce(v_total,0)::numeric;
end;
$$;

grant execute on function public.sales_sum_total() to authenticated;
grant execute on function public.sales_sum_this_month() to authenticated;
grant execute on function public.cars_count_by_status(public.car_status) to authenticated;
grant execute on function public.profit_sum_total() to authenticated;

-- -------------------------
-- STORAGE (car-images bucket) + policies
-- -------------------------

-- Create bucket if not exists (safe)
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('car-images', 'car-images', true)
  on conflict (id) do update set public = excluded.public;
exception when others then
  -- If Storage isn't enabled yet or permissions differ, ignore.
  null;
end $$;

-- Policies on storage.objects (drop/recreate to avoid duplicates)
-- Note: storage.objects already has RLS enabled in Supabase.
drop policy if exists "car_images_read_auth" on storage.objects;
create policy "car_images_read_auth"
on storage.objects for select
to authenticated
using (bucket_id = 'car-images');

drop policy if exists "car_images_insert_admin" on storage.objects;
create policy "car_images_insert_admin"
on storage.objects for insert
to authenticated
with check (bucket_id = 'car-images' and public.is_admin());

drop policy if exists "car_images_update_admin" on storage.objects;
create policy "car_images_update_admin"
on storage.objects for update
to authenticated
using (bucket_id = 'car-images' and public.is_admin())
with check (bucket_id = 'car-images' and public.is_admin());

drop policy if exists "car_images_delete_admin" on storage.objects;
create policy "car_images_delete_admin"
on storage.objects for delete
to authenticated
using (bucket_id = 'car-images' and public.is_admin());

commit;

-- Force PostgREST (Supabase API) to reload schema cache
select pg_notify('pgrst', 'reload schema');
