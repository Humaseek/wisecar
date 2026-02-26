-- Car Showroom Pro (Supabase) - Schema + RLS + RPC
-- ملاحظة: شغّل هذا الملف مرة واحدة داخل Supabase SQL Editor.

-- ============================
-- Extensions
-- ============================
create extension if not exists "pgcrypto";

-- ============================
-- Helper functions (roles)
-- ============================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.is_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'sales'
  );
$$;

-- ============================
-- Profiles
-- ============================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'sales' check (role in ('admin','sales')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- اقرأ ملفك أو (الأدمن) يقرأ الجميع
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

-- تعديل ملف profiles للأدمن فقط (تغيير role)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- منع حذف/إدخال يدوي (الإدخال يتم عبر Trigger)
drop policy if exists "profiles_insert_none" on public.profiles;
create policy "profiles_insert_none"
on public.profiles
for insert
to authenticated
with check (false);

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles
for delete
to authenticated
using (public.is_admin());

-- Trigger: إنشاء profile تلقائيًا عند تسجيل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), ''),
    'sales'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- (قد يكون موجود مسبقًا)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============================
-- Common updated_at trigger
-- ============================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================
-- Cars
-- ============================
create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year int,
  type text,
  status text not null default 'available' check (status in ('available','reserved','sold')),
  mileage int,
  asking_price numeric(12,2) not null default 0,
  description text,
  vin text,
  main_image_url text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cars enable row level security;

drop trigger if exists set_cars_updated_at on public.cars;
create trigger set_cars_updated_at
before update on public.cars
for each row execute procedure public.set_updated_at();

-- Select: كل المستخدمين المسجلين
drop policy if exists "cars_select_all" on public.cars;
create policy "cars_select_all"
on public.cars
for select
to authenticated
using (true);

-- Admin CRUD
drop policy if exists "cars_insert_admin" on public.cars;
create policy "cars_insert_admin"
on public.cars
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "cars_update_admin" on public.cars;
create policy "cars_update_admin"
on public.cars
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "cars_delete_admin" on public.cars;
create policy "cars_delete_admin"
on public.cars
for delete
to authenticated
using (public.is_admin());

-- ============================
-- Car Finance (مخفي عن المبيعات)
-- ============================
create table if not exists public.car_finance (
  car_id uuid primary key references public.cars(id) on delete cascade,
  purchase_price numeric(12,2),
  ad_spend numeric(12,2),
  fuel_cost numeric(12,2),
  other_cost numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid()
);

alter table public.car_finance enable row level security;

drop trigger if exists set_car_finance_updated_at on public.car_finance;
create trigger set_car_finance_updated_at
before update on public.car_finance
for each row execute procedure public.set_updated_at();

-- Admin فقط
drop policy if exists "car_finance_admin_all" on public.car_finance;
create policy "car_finance_admin_all"
on public.car_finance
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================
-- Car Images
-- ============================
create table if not exists public.car_images (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  path text not null,
  public_url text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) default auth.uid()
);

alter table public.car_images enable row level security;

-- الجميع يقرأ الصور
drop policy if exists "car_images_select_all" on public.car_images;
create policy "car_images_select_all"
on public.car_images
for select
to authenticated
using (true);

-- Admin فقط يضيف/يحذف
drop policy if exists "car_images_insert_admin" on public.car_images;
create policy "car_images_insert_admin"
on public.car_images
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "car_images_delete_admin" on public.car_images;
create policy "car_images_delete_admin"
on public.car_images
for delete
to authenticated
using (public.is_admin());

drop policy if exists "car_images_update_admin" on public.car_images;
create policy "car_images_update_admin"
on public.car_images
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================
-- Customers
-- ============================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  city text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute procedure public.set_updated_at();

-- Select: كل المستخدمين المسجلين
drop policy if exists "customers_select_all" on public.customers;
create policy "customers_select_all"
on public.customers
for select
to authenticated
using (true);

-- Insert: Admin أو Sales (B)
drop policy if exists "customers_insert_admin_or_sales" on public.customers;
create policy "customers_insert_admin_or_sales"
on public.customers
for insert
to authenticated
with check (
  public.is_admin()
  or (public.is_sales() and created_by = auth.uid())
);

-- Update/Delete: Admin فقط
drop policy if exists "customers_update_admin" on public.customers;
create policy "customers_update_admin"
on public.customers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customers_delete_admin" on public.customers;
create policy "customers_delete_admin"
on public.customers
for delete
to authenticated
using (public.is_admin());

-- ============================
-- Suppliers (Admin فقط)
-- ============================
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  phone text,
  email text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute procedure public.set_updated_at();

-- Select: Admin فقط
drop policy if exists "suppliers_select_admin" on public.suppliers;
create policy "suppliers_select_admin"
on public.suppliers
for select
to authenticated
using (public.is_admin());

-- CRUD: Admin فقط
drop policy if exists "suppliers_admin_all" on public.suppliers;
create policy "suppliers_admin_all"
on public.suppliers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================
-- Sales
-- ============================
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  sold_price numeric(12,2) not null,
  payment_method text,
  sold_at timestamptz not null default now(),
  notes text,
  salesperson_id uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.sales enable row level security;

-- Select: Admin يشوف الكل، Sales يشوف مبيعاته فقط
drop policy if exists "sales_select_admin_or_own" on public.sales;
create policy "sales_select_admin_or_own"
on public.sales
for select
to authenticated
using (public.is_admin() or salesperson_id = auth.uid());

-- Insert:
-- A) موظف المبيعات لا يختار salesperson_id (يتسجل تلقائيًا كـ auth.uid())
--    ونفرض ذلك عبر policy.
--    ونمنع البيع لسيارة status='sold'.
drop policy if exists "sales_insert_admin" on public.sales;
create policy "sales_insert_admin"
on public.sales
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "sales_insert_sales_own" on public.sales;
create policy "sales_insert_sales_own"
on public.sales
for insert
to authenticated
with check (
  public.is_sales()
  and salesperson_id = auth.uid()
  and exists (select 1 from public.cars c where c.id = car_id and c.status <> 'sold')
);

-- Update/Delete: Admin فقط
drop policy if exists "sales_update_admin" on public.sales;
create policy "sales_update_admin"
on public.sales
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sales_delete_admin" on public.sales;
create policy "sales_delete_admin"
on public.sales
for delete
to authenticated
using (public.is_admin());

-- Trigger: تحديث حالة السيارة عند البيع/الحذف
create or replace function public.sales_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.cars
     set status = 'sold'
   where id = new.car_id;
  return new;
end;
$$;

create or replace function public.sales_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- إذا ما في مبيعات أخرى لنفس السيارة، رجّعها متاحة
  if not exists (select 1 from public.sales s where s.car_id = old.car_id) then
    update public.cars
       set status = 'available'
     where id = old.car_id
       and status = 'sold';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_sales_after_insert on public.sales;
create trigger trg_sales_after_insert
after insert on public.sales
for each row execute procedure public.sales_after_insert();

drop trigger if exists trg_sales_after_delete on public.sales;
create trigger trg_sales_after_delete
after delete on public.sales
for each row execute procedure public.sales_after_delete();

-- ============================
-- View: sales_list_view (Dashboard + Sales page)
-- ============================
create or replace view public.sales_list_view as
select
  s.id,
  s.sold_at,
  s.sold_price,
  s.payment_method,
  s.notes,
  s.salesperson_id,
  (coalesce(c.make,'') || ' ' || coalesce(c.model,'') || case when c.year is null then '' else ' ' || c.year::text end) as car_title,
  cu.full_name as customer_name,
  p.full_name as sales_user_name
from public.sales s
join public.cars c on c.id = s.car_id
join public.customers cu on cu.id = s.customer_id
left join public.profiles p on p.id = s.salesperson_id;

-- اجعل الـ View تعمل بصلاحيات المستدعي (لتطبيق RLS بدقة)
alter view public.sales_list_view set (security_invoker = true);

-- ============================
-- RPC: Dashboard sums
-- ============================
create or replace function public.sales_sum_total()
returns numeric
language sql
stable
as $$
  select coalesce(sum(sold_price), 0)
  from public.sales;
$$;

grant execute on function public.sales_sum_total() to authenticated;

create or replace function public.sales_sum_this_month()
returns numeric
language sql
stable
as $$
  select coalesce(sum(sold_price), 0)
  from public.sales
  where sold_at >= date_trunc('month', now());
$$;

grant execute on function public.sales_sum_this_month() to authenticated;

-- Profit: Admin فقط
create or replace function public.profit_sum_total()
returns numeric
language plpgsql
stable
as $$
declare
  v numeric;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  with latest_sales as (
    select distinct on (car_id)
      car_id,
      sold_price
    from public.sales
    order by car_id, sold_at desc
  )
  select
    coalesce(sum(ls.sold_price), 0)
    - coalesce(sum(
      coalesce(f.purchase_price,0)
      + coalesce(f.ad_spend,0)
      + coalesce(f.fuel_cost,0)
      + coalesce(f.other_cost,0)
    ), 0)
  into v
  from latest_sales ls
  left join public.car_finance f on f.car_id = ls.car_id;

  return coalesce(v, 0);
end;
$$;

grant execute on function public.profit_sum_total() to authenticated;

-- ============================
-- Storage (اختياري): bucket + policies لصور السيارات
-- ============================
-- 1) أنشئ bucket باسم car-images (Public) من Storage UI أو اترك هذا الجزء يعمل.
insert into storage.buckets (id, name, public)
values ('car-images', 'car-images', true)
on conflict (id) do nothing;

-- 2) Policies على storage.objects
-- ملاحظة: Supabase يفعّل RLS على storage.objects افتراضيًا.

drop policy if exists "car_images_storage_read" on storage.objects;
create policy "car_images_storage_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'car-images');

-- Admin يرفع/يحدث/يحذف
drop policy if exists "car_images_storage_admin_write" on storage.objects;
create policy "car_images_storage_admin_write"
on storage.objects
for all
to authenticated
using (bucket_id = 'car-images' and public.is_admin())
with check (bucket_id = 'car-images' and public.is_admin());

-- ============================
-- Grants (عادة Supabase يغطيها، لكن نحطها كضمان)
-- ============================
grant usage on schema public to authenticated;

grant select on public.sales_list_view to authenticated;

-- ملاحظة: صلاحيات الجداول يتم ضبطها عبر RLS، لكن لازم grants أساسية
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, usage on all sequences in schema public to authenticated;
