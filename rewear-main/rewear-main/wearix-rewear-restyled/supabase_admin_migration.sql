-- ============================================================
-- WEARIX — Admin Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add approval status to products (listings need admin approval)
alter table products
  add column if not exists status text default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

-- 2. Add rejection reason fields
alter table products
  add column if not exists rejection_reason text;

alter table sellers
  add column if not exists rejection_reason text,
  add column if not exists verified_at timestamptz;

-- 3. Set existing products to approved (they were seeded by admin)
update products set status = 'approved' where status = 'pending';

-- 4. ADMIN TABLE — simple pin-based admin access (upgrade to auth later)
create table if not exists admin_sessions (
  id         uuid primary key default gen_random_uuid(),
  pin_hash   text not null,
  created_at timestamptz default now()
);

-- Insert default admin PIN: 1234 (sha256 hashed)
-- Change this immediately after setup!
insert into admin_sessions (pin_hash)
values ('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
on conflict do nothing;

-- 5. RLS — admin reads everything
-- Products: admin can update status
drop policy if exists "Admin can update products" on products;
create policy "Admin can update products"
  on products for update
  to anon
  using (true)
  with check (true);

-- Sellers: admin can update verified status
drop policy if exists "Admin can update sellers" on sellers;
create policy "Admin can update sellers"
  on sellers for update
  to anon
  using (true)
  with check (true);

-- Sellers: admin can read all
drop policy if exists "Admin can read all sellers" on sellers;
create policy "Admin can read all sellers"
  on sellers for select
  to anon
  using (true);

-- Orders: admin can read all
drop policy if exists "Admin can read all orders" on orders;
create policy "Admin can read all orders"
  on orders for select
  to anon
  using (true);

-- Orders: admin can update status
drop policy if exists "Admin can update orders" on orders;
create policy "Admin can update orders"
  on orders for update
  to anon
  using (true)
  with check (true);
